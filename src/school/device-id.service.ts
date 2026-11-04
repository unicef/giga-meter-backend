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
 * device_hardware_id, which on a PC without one holds the Windows install ID or
 * the PC serial instead, as before), the motherboard serial and the disk
 * serial. The Windows
 * install ID (MachineGuid) is used only when none of the three can be used:
 * none can be read, or each one that can is shared with other PCs.
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

const ALL_FIELDS: SignalField[] = [...HARDWARE_FIELDS, 'machine_guid'];

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

/**
 * First half of each pg_advisory_xact_lock key, so these locks can't collide
 * with other advisory locks; the second half comes from one value.
 */
export const DEVICE_ID_LOCK_KEY = 8828;

/**
 * How long a registration waits for another one's lock before giving up. The
 * transaction's own time limit can't interrupt a query waiting on a lock, so a
 * stuck lock would otherwise hold a registration as long as it lasts. Giving
 * up here makes the registration fall back to being saved without a device ID.
 */
export const LOCK_WAIT = '5s';

/** A 32-bit key (FNV-1a) for one value, for the second half of a lock key. */
export function valueLockKey(field: SignalField, value: string): number {
  let hash = 0x811c9dc5;
  for (const char of `${field}:${value}`) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash | 0;
}

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
 * The values a registration is matched on: the hardware values it has that
 * aren't shared with other PCs, or the Windows install ID when there are none
 * (nothing readable, or every readable value shared).
 */
export function matchFields(
  signals: DeviceSignals,
  shared: Set<SignalField> = new Set(),
): SignalField[] {
  const usable = HARDWARE_FIELDS.filter(
    (field) => signals[field] != null && !shared.has(field),
  );
  if (usable.length > 0) {
    return usable;
  }
  return signals.machine_guid != null && !shared.has('machine_guid')
    ? ['machine_guid']
    : [];
}

/**
 * Exact, as the database lookups compare. The app sends each value from the
 * same source every time (systeminformation lowercases the firmware UUID).
 */
function sameValue(a: string | null, b: string | null): boolean {
  return a != null && a === b;
}

/**
 * Decides which earlier PC, if any, a registration belongs to.
 *
 * - A value that already belongs to more than one PC (`shared`) doesn't count,
 *   because it can't tell PCs apart. When no hardware value counts, the
 *   Windows install ID is used instead, if it isn't shared.
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

  // The Windows install ID is only looked at when no hardware value counts.
  const looked = HARDWARE_FIELDS.some(
    (field) => signals[field] != null && !shared.has(field),
  )
    ? HARDWARE_FIELDS
    : ALL_FIELDS;
  for (const field of looked) {
    if (signals[field] != null && shared.has(field)) {
      flags.push(`${field}_shared`);
    }
  }

  const fields = matchFields(signals, shared);
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
   * Locks each value the registration sent, for the rest of the transaction,
   * so two registrations of the same PC arriving together don't get two IDs or
   * two rows. Every lookup here is by one of these values, so registrations
   * that share none don't wait for each other, and one with no values takes no
   * lock. Keys are taken in sorted order, so two registrations can't deadlock.
   */
  async lock(
    tx: Prisma.TransactionClient,
    signals: DeviceSignals,
  ): Promise<void> {
    const keys = [
      ...new Set(
        ALL_FIELDS.filter((field) => signals[field] != null).map((field) =>
          valueLockKey(field, signals[field]),
        ),
      ),
    ].sort((a, b) => a - b);
    if (keys.length > 0) {
      await tx.$queryRaw`SELECT set_config('lock_timeout', ${LOCK_WAIT}, true)`;
    }
    for (const key of keys) {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${DEVICE_ID_LOCK_KEY}::int4, ${key}::int4)`;
    }
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
    const shared = new Set<SignalField>();
    for (const field of HARDWARE_FIELDS) {
      if (
        signals[field] != null &&
        (await this.isShared(tx, field, signals[field]))
      ) {
        shared.add(field);
      }
    }
    // The Windows install ID only counts when no hardware value does.
    if (
      matchFields(signals, shared)[0] === 'machine_guid' &&
      (await this.isShared(tx, 'machine_guid', signals.machine_guid))
    ) {
      shared.add('machine_guid');
    }
    const counting = matchFields(signals, shared);
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
