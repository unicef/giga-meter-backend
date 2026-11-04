import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import {
  cleanDeviceSignal,
  sanitizeHardwareId,
} from '../common/hardware-id.utils';

/**
 * Device ID (TECH-8828): one ID for one physical PC across all its
 * registrations (reinstalls, Windows users, logouts).
 *
 * A PC is recognised by three hardware values: the firmware UUID (stored in
 * device_hardware_id), the motherboard serial and the disk serial. The Windows
 * install ID (MachineGuid) is used only when none of the three can be read.
 *
 * The ID is not a hash of the values: a hash would change when one value
 * changes (a new disk), while the rules below say it is the same PC. The server
 * gives a PC a random ID at its first registration, and later registrations
 * that match it keep that ID.
 */

export type SignalField =
  | 'firmware_uuid'
  | 'baseboard_serial'
  | 'disk_serial'
  | 'machine_guid';

export const HARDWARE_FIELDS: SignalField[] = [
  'firmware_uuid',
  'baseboard_serial',
  'disk_serial',
];

/** The dailycheckapp_school column that holds each value. */
export const SIGNAL_COLUMNS: Record<
  SignalField,
  'device_hardware_id' | 'baseboard_serial' | 'disk_serial' | 'machine_guid'
> = {
  firmware_uuid: 'device_hardware_id',
  baseboard_serial: 'baseboard_serial',
  disk_serial: 'disk_serial',
  machine_guid: 'machine_guid',
};

export type DeviceSignals = Record<SignalField, string | null>;

/** An earlier PC, with the values of its latest registration. */
export interface CandidateDevice extends DeviceSignals {
  device_id: string;
}

export interface DeviceDecision {
  /** The matched PC's ID, or null for a new PC. */
  device_id: string | null;
  flags: string[];
}

export interface DeviceAssignment {
  device_id: string;
  device_id_flags: string[];
}

/** Lock key for pg_advisory_xact_lock: one device ID decision at a time. */
export const DEVICE_ID_LOCK_KEY = 8828;

/**
 * The values a registration sent, cleaned: blank values, known placeholders and
 * the blocked generic firmware UUIDs become null.
 */
export function cleanSignals(input: {
  device_hardware_id?: string | null;
  baseboard_serial?: string | null;
  disk_serial?: string | null;
  machine_guid?: string | null;
}): DeviceSignals {
  return {
    firmware_uuid: cleanDeviceSignal(
      sanitizeHardwareId(input?.device_hardware_id),
    ),
    baseboard_serial: cleanDeviceSignal(input?.baseboard_serial),
    disk_serial: cleanDeviceSignal(input?.disk_serial),
    machine_guid: cleanDeviceSignal(input?.machine_guid),
  };
}

/**
 * The values a registration is matched on: the three hardware values it has,
 * or the Windows install ID when none of them could be read.
 */
export function matchFields(signals: DeviceSignals): SignalField[] {
  const readable = HARDWARE_FIELDS.filter((field) => signals[field] != null);
  if (readable.length > 0) {
    return readable;
  }
  return signals.machine_guid != null ? ['machine_guid'] : [];
}

function sameValue(a: string | null, b: string | null): boolean {
  return a != null && b != null && a.toLowerCase() === b.toLowerCase();
}

/**
 * Decides which earlier PC, if any, a registration belongs to.
 *
 * - A value that already belongs to more than one PC (`shared`) doesn't count,
 *   because it can't tell PCs apart.
 * - Only values present on both sides are compared; a missing value is ignored.
 * - It's the same PC when at least one value matches and no more values changed
 *   than matched. Each changed value is flagged.
 * - If two PCs qualify, follow the one with the same firmware UUID; otherwise
 *   it's a new PC. Flagged either way.
 */
export function decideDevice(
  signals: DeviceSignals,
  candidates: CandidateDevice[],
  shared: Set<SignalField>,
): DeviceDecision {
  const flags: string[] = [];
  if (HARDWARE_FIELDS.every((field) => signals[field] == null)) {
    flags.push('nothing_readable');
  }

  const fields = matchFields(signals).filter((field) => {
    if (shared.has(field)) {
      flags.push(`${field}_shared`);
      return false;
    }
    return true;
  });
  if (fields.length === 0) {
    return { device_id: null, flags };
  }

  const qualifying: { candidate: CandidateDevice; changed: SignalField[] }[] =
    [];
  for (const candidate of candidates) {
    let matched = 0;
    const changed: SignalField[] = [];
    for (const field of fields) {
      if (candidate[field] == null) {
        continue;
      }
      if (sameValue(candidate[field], signals[field])) {
        matched++;
      } else {
        changed.push(field);
      }
    }
    if (matched >= 1 && changed.length <= matched) {
      qualifying.push({ candidate, changed });
    }
  }

  if (qualifying.length === 0) {
    return { device_id: null, flags };
  }

  let chosen = qualifying[0];
  if (qualifying.length > 1) {
    flags.push('conflict');
    const byFirmware = fields.includes('firmware_uuid')
      ? qualifying.filter((q) =>
          sameValue(q.candidate.firmware_uuid, signals.firmware_uuid),
        )
      : [];
    if (byFirmware.length !== 1) {
      return { device_id: null, flags };
    }
    chosen = byFirmware[0];
  }

  flags.push(...chosen.changed.map((field) => `${field}_changed`));
  return { device_id: chosen.candidate.device_id, flags };
}

@Injectable()
export class DeviceIdService {
  /**
   * Takes the device ID lock for the rest of the transaction, so two
   * registrations of the same new PC arriving together don't get two IDs.
   * Registrations are few, so one lock for all of them is enough.
   */
  async lock(tx: Prisma.TransactionClient): Promise<void> {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${DEVICE_ID_LOCK_KEY})`;
  }

  /**
   * Works out the device ID for a registration about to be stored. Call it
   * inside a transaction, after lock().
   *
   * When the firmware UUID counts, older registrations with the same UUID and no
   * device ID (made before 2.0.4) get the same ID, so the PC isn't counted twice.
   */
  async assign(
    tx: Prisma.TransactionClient,
    signals: DeviceSignals,
  ): Promise<DeviceAssignment> {
    const fields = matchFields(signals);
    const shared = new Set<SignalField>();
    for (const field of fields) {
      if (await this.isShared(tx, field, signals[field])) {
        shared.add(field);
      }
    }
    const counting = fields.filter((field) => !shared.has(field));
    const candidates = counting.length
      ? await this.candidates(tx, signals, counting)
      : [];

    const decision = decideDevice(signals, candidates, shared);
    const device_id = decision.device_id ?? uuidv4();

    if (counting.includes('firmware_uuid')) {
      await tx.dailycheckapp_school.updateMany({
        where: { device_hardware_id: signals.firmware_uuid, device_id: null },
        data: { device_id },
      });
    }

    return { device_id, device_id_flags: decision.flags };
  }

  /**
   * Whether a value already belongs to more than one PC. For the firmware UUID,
   * registrations from before 2.0.4 (no device ID yet) at two or more schools
   * count too.
   */
  private async isShared(
    tx: Prisma.TransactionClient,
    field: SignalField,
    value: string,
  ): Promise<boolean> {
    // The column name comes from SIGNAL_COLUMNS, never from the request.
    const column = Prisma.raw(`"${SIGNAL_COLUMNS[field]}"`);
    const [counts] = await tx.$queryRaw<
      { devices: number; old_schools: number }[]
    >`
      SELECT
        count(DISTINCT device_id) FILTER (WHERE device_id IS NOT NULL)::int AS devices,
        count(DISTINCT giga_id_school) FILTER (WHERE device_id IS NULL)::int AS old_schools
      FROM dailycheckapp_school
      WHERE ${column} = ${value}`;
    if ((counts?.devices ?? 0) >= 2) {
      return true;
    }
    return field === 'firmware_uuid' && (counts?.old_schools ?? 0) >= 2;
  }

  /** Earlier PCs sharing a counting value, each with its latest registration. */
  private async candidates(
    tx: Prisma.TransactionClient,
    signals: DeviceSignals,
    fields: SignalField[],
  ): Promise<CandidateDevice[]> {
    const matches = await tx.dailycheckapp_school.findMany({
      where: {
        device_id: { not: null },
        OR: fields.map((field) => ({
          [SIGNAL_COLUMNS[field]]: signals[field],
        })),
      },
      distinct: ['device_id'],
      select: { device_id: true },
    });
    const ids = matches.map((row) => row.device_id).filter(Boolean);
    if (ids.length === 0) {
      return [];
    }

    const rows = await tx.dailycheckapp_school.findMany({
      where: { device_id: { in: ids } },
      orderBy: { id: 'desc' },
      select: {
        device_id: true,
        device_hardware_id: true,
        baseboard_serial: true,
        disk_serial: true,
        machine_guid: true,
      },
    });

    const latest = new Map<string, CandidateDevice>();
    for (const row of rows) {
      if (latest.has(row.device_id)) {
        continue;
      }
      latest.set(row.device_id, {
        device_id: row.device_id,
        ...cleanSignals(row),
      });
    }
    return [...latest.values()];
  }
}
