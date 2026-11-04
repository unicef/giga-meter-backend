import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, dailycheckapp_school as School } from '@prisma/client';
import { CreateSchoolResponseDto, SchoolDto } from './school.dto';
import { v4 as uuidv4 } from 'uuid';
import { GeolocationUtility } from '../geolocation/geolocation.utility';
import {
  sanitizeHardwareId,
  isHardwareIdBlocked,
} from '../common/hardware-id.utils';
import { normalizeGigaId } from '../utility/utility';
import * as Sentry from '@sentry/node';
import {
  cleanSignals,
  DeviceAssignment,
  DeviceIdService,
  DeviceSignals,
} from './device-id.service';

const ACTIVE = [{ is_active: null }, { is_active: true }];

/**
 * Limits for the registration transaction (TECH-8828). Prisma's defaults (2 s
 * to get a connection, 5 s in all) are much shorter than an ordinary query's
 * wait for a connection, so a busy pool would fail registrations that today
 * only get slower.
 */
const REGISTRATION_TRANSACTION = { maxWait: 10_000, timeout: 20_000 };

/** Flag on a registration saved without a device ID because working it out failed. */
const DEVICE_ID_FAILED = 'device_id_failed';

/** The hardware values a registration request carries. */
interface HardwareValues {
  device_hardware_id?: string | null;
  baseboard_serial?: string | null;
  disk_serial?: string | null;
  machine_guid?: string | null;
}

/** A registration's cleaned values and the device ID worked out from them. */
interface RegistrationDevice extends DeviceAssignment {
  signals: DeviceSignals;
}

/**
 * This PC's registrations: those with its device ID, and those from before
 * 2.0.4 (no device ID yet) with its hardware ID. Null when the PC can't be
 * recognised (no device ID and no usable hardware ID): then no registration is
 * this PC's.
 */
function samePc(
  device: RegistrationDevice,
): Prisma.dailycheckapp_schoolWhereInput | null {
  const rows: Prisma.dailycheckapp_schoolWhereInput[] = [];
  if (device.device_id) {
    rows.push({ device_id: device.device_id });
  }
  if (device.signals.firmware_uuid) {
    rows.push({
      device_id: null,
      device_hardware_id: device.signals.firmware_uuid,
    });
  }
  return rows.length > 0 ? { OR: rows } : null;
}

@Injectable()
export class SchoolService {
  constructor(
    private prisma: PrismaService,
    private readonly geolocationUtility: GeolocationUtility,
    private readonly deviceIdService: DeviceIdService,
  ) {}

  async schools(
    skip?: number,
    take?: number,
    giga_id_school?: string,
    country_iso3_code?: string,
    write_access?: boolean,
    countries?: string[],
  ): Promise<SchoolDto[]> {
    const filter = {
      giga_id_school,
      country_code: { in: countries },
    };

    if (!giga_id_school) {
      delete filter.giga_id_school;
    }
    if (write_access) {
      delete filter.country_code;
    }
    if (country_iso3_code) {
      const dbCountry = await this.prisma.dailycheckapp_country.findFirst({
        where: { code_iso3: country_iso3_code },
      });
      if (
        !dbCountry?.code ||
        (!write_access && !countries?.includes(dbCountry.code))
      ) {
        return [];
      }
      filter.country_code = { in: [dbCountry.code] };
    }

    const schools = await this.prisma.dailycheckapp_school.findMany({
      skip,
      take,
      where: filter,
      orderBy: { created: 'desc' },
    });

    return Promise.all(schools.map((school) => this.toDto(school)));
  }

  async schoolsByGigaId(
    giga_id_school: string,
    write_access?: boolean,
    countries?: string[],
  ): Promise<SchoolDto[]> {
    const query = {
      where: {
        giga_id_school,
        country_code: { in: countries },
      },
    };
    if (write_access) {
      delete query.where.country_code;
    }

    const schools = await this.prisma.dailycheckapp_school.findMany(query);
    return Promise.all(schools.map((school) => this.toDto(school)));
  }

  async schoolsById(
    id: number,
    write_access?: boolean,
    countries?: string[],
  ): Promise<SchoolDto[]> {
    const query = {
      where: {
        id,
        country_code: { in: countries },
      },
    };
    if (write_access) {
      delete query.where.country_code;
    }

    const schools = await this.prisma.dailycheckapp_school.findMany(query);
    return Promise.all(schools.map((school) => this.toDto(school)));
  }

  async schoolsByCountryId(country_code: string): Promise<SchoolDto[]> {
    const schools = await this.prisma.dailycheckapp_school.findMany({
      where: { country_code },
    });
    return Promise.all(schools.map((school) => this.toDto(school)));
  }

  async checkNotify(user_id: string): Promise<boolean> {
    const school = await this.prisma.dailycheckapp_school.findFirstOrThrow({
      where: { user_id },
    });

    if (school?.notify) {
      await this.prisma.dailycheckapp_school.updateMany({
        where: { user_id },
        data: { notify: false },
      });
      return true;
    }
    return false;
  }

  async createSchool(schoolDto: SchoolDto): Promise<CreateSchoolResponseDto> {
    // Registering the same device for the same school twice returns the row it
    // already has instead of minting another user_id. The client used to send
    // one POST per tap on the confirmation screen, and network retries or
    // at-least-once delivery can still double-submit, so the insert cannot be
    // unconditional.
    //
    // The distance to the school is worked out first, outside the transaction
    // below, so the transaction never waits on a second connection. On a repeat
    // submission the result is not used.
    //
    // The stored row is returned as it stands, with none of the device context
    // the payload carries copied onto it. Every measurement already reports its
    // own app_version, ip_address, country_code, windows_username,
    // installed_path and wifi_connections, so the live values are there and
    // this row stays a record of the registration. The only two columns
    // measurements do not carry are os and mac_address, and neither is worth
    // writing: mac_address is Capacitor's Device.getId(), regenerated on every
    // app relaunch, and an os that really changed under the same hardware id
    // means a different machine, not a field to overwrite in place. The one
    // exception is a registration from before 2.0.4, which gets the hardware
    // values and device ID (fillInDevice).
    //
    // A repeat is the same PC for the same school while that registration is
    // active, as before, but the PC is now recognised by its device ID
    // (TECH-8828), so PCs copied from one disk image that share a firmware UUID
    // are no longer taken for one. Every Windows user on a PC shares its
    // registration, as automatic registration does.
    const key = this.registrationKey(schoolDto);
    await this.addGeolocation(schoolDto);
    const { school, repeat } = await this.registerWithDevice(schoolDto, key);
    if (repeat) {
      console.warn(
        `Duplicate registration absorbed for giga_id_school ${key.giga_id_school}, ` +
          `device_hardware_id ${key.device_hardware_id}: returning user_id ${school.user_id}`,
      );
    }

    return {
      user_id: school.user_id,
      is_verified: await this.resolveIsVerified(school.giga_id_school),
    };
  }

  /**
   * Finds this PC's registration for the school or stores a new one, with its
   * device ID (TECH-8828). If working out the device ID fails for any reason,
   * the registration is still saved the way it was before 2.0.4, without a
   * device ID, so the device ID can only be missing, never block a school.
   */
  private async registerWithDevice(
    schoolDto: SchoolDto,
    key: { giga_id_school?: string; device_hardware_id?: string },
  ): Promise<{ school: School; repeat: boolean }> {
    try {
      return await this.withDevice(schoolDto, async (tx, device) => {
        const pc = samePc(device);
        const existing =
          key.giga_id_school && pc
            ? await tx.dailycheckapp_school.findFirst({
                where: {
                  giga_id_school: key.giga_id_school,
                  AND: [{ OR: ACTIVE }, pc],
                },
                // Oldest first: the identity the device has been reporting all along.
                orderBy: { id: 'asc' },
              })
            : null;
        if (existing) {
          return {
            school: await this.fillInDevice(tx, existing, device),
            repeat: true,
          };
        }

        return {
          school: await this.insertRegistration(
            tx,
            this.toModel(schoolDto),
            device,
          ),
          repeat: false,
        };
      });
    } catch (error) {
      console.error(
        `Device ID failed for giga_id_school ${key.giga_id_school}; ` +
          'saving the registration without one:',
        error,
      );
      Sentry.captureException(error);
      return this.registerWithoutDevice(schoolDto, key);
    }
  }

  /**
   * The registration as before 2.0.4: a repeat is an active registration with
   * the same hardware ID for the same school. The hardware values are still
   * stored, so the device ID can be worked out later.
   */
  private async registerWithoutDevice(
    schoolDto: SchoolDto,
    key: { giga_id_school?: string; device_hardware_id?: string },
  ): Promise<{ school: School; repeat: boolean }> {
    const existing =
      key.giga_id_school && key.device_hardware_id
        ? await this.prisma.dailycheckapp_school.findFirst({
            where: {
              giga_id_school: key.giga_id_school,
              device_hardware_id: key.device_hardware_id,
              OR: ACTIVE,
            },
            // Oldest first: the identity the device has been reporting all along.
            orderBy: { id: 'asc' },
          })
        : null;
    if (existing) {
      return { school: existing, repeat: true };
    }
    const signals = cleanSignals(schoolDto);
    const school = await this.prisma.dailycheckapp_school.create({
      data: {
        ...this.toModel(schoolDto),
        baseboard_serial: signals.baseboard_serial,
        disk_serial: signals.disk_serial,
        machine_guid: signals.machine_guid,
        device_id: null,
        device_id_flags: [DEVICE_ID_FAILED],
      },
    });
    return { school, repeat: false };
  }

  /** Adds the distance between the PC and the school to the registration. */
  private async addGeolocation(schoolDto: SchoolDto): Promise<void> {
    if (schoolDto.geolocation &&
      schoolDto.geolocation.location &&
      schoolDto.geolocation.accuracy) {
      try {
        // Get the school coordinates based on giga_id_school
        if (schoolDto.giga_id_school) {
          // Use the common utility to calculate distance and set flags
          const geoResult = await this.geolocationUtility.calculateDistanceAndSetFlag(
            schoolDto.giga_id_school,
            schoolDto.geolocation.location,
            schoolDto.geolocation.accuracy
          );

          // Store the results in the measurement DTO
          schoolDto.detected_location_accuracy = geoResult.accuracy;
          schoolDto.detected_location_distance = geoResult.distance;
          schoolDto.detected_location_is_flagged = geoResult.isFlagged;
        }
      } catch (error) {
        console.error('Error processing geolocation data:', error);
      }
    }
  }

  /**
   * Runs a registration in one transaction, under a lock on its hardware
   * values: works out the device ID first, then hands it to `register`, which
   * looks for this PC's registration or stores a new one. Two requests for the
   * same PC therefore can't both decide there is none.
   */
  private async withDevice<T>(
    values: HardwareValues,
    register: (
      tx: Prisma.TransactionClient,
      device: RegistrationDevice,
    ) => Promise<T>,
  ): Promise<T> {
    const signals = cleanSignals(values);
    return this.prisma.$transaction(async (tx) => {
      await this.deviceIdService.lock(tx, signals);
      const device = await this.deviceIdService.assign(tx, signals);
      return register(tx, { ...device, signals });
    }, REGISTRATION_TRANSACTION);
  }

  /** Stores a new registration with its hardware values and device ID. */
  private insertRegistration(
    tx: Prisma.TransactionClient,
    data: any,
    device: RegistrationDevice,
  ): Promise<School> {
    return tx.dailycheckapp_school.create({
      data: {
        ...data,
        baseboard_serial: device.signals.baseboard_serial,
        disk_serial: device.signals.disk_serial,
        machine_guid: device.signals.machine_guid,
        device_id: device.device_id,
        device_id_flags: device.device_id_flags,
      },
    });
  }

  /**
   * A registration from before 2.0.4 that this PC is using again gets the
   * hardware values and device ID it now sends, so its tests and pings count
   * under the device ID from now on. Any other registration is returned as it
   * stands.
   */
  private async fillInDevice(
    tx: Prisma.TransactionClient,
    row: School,
    device: RegistrationDevice,
  ): Promise<School> {
    const hasValues =
      row.baseboard_serial != null ||
      row.disk_serial != null ||
      row.machine_guid != null;
    if (row.device_id != null && hasValues) {
      return row;
    }
    return tx.dailycheckapp_school.update({
      where: { id: row.id },
      data: {
        baseboard_serial: device.signals.baseboard_serial,
        disk_serial: device.signals.disk_serial,
        machine_guid: device.signals.machine_guid,
        device_id: device.device_id,
        device_id_flags: device.device_id_flags,
      },
    });
  }

  /**
   * The (school, device) pair a payload identifies, normalized exactly the way
   * toModel() stores it so the lookup and the insert cannot drift apart.
   */
  private registrationKey(school: SchoolDto): {
    giga_id_school?: string;
    device_hardware_id?: string;
  } {
    return {
      giga_id_school:
        school.giga_id_school == null
          ? school.giga_id_school
          : normalizeGigaId(school.giga_id_school),
      device_hardware_id: sanitizeHardwareId(school.device_hardware_id),
    };
  }

  async checkExistingInstallation(device_hardware_id: string): Promise<{
    exists: boolean;
    user_id?: string;
    school_id?: string;
    giga_id_school?: string;
    mac_address?: string;
    os?: string;
    ip_address?: string;
    app_version?: string;
    country_code?: string;
    source?: string;
    schoolInfo?: any;
    is_active?: boolean;
    is_verified?: boolean;
  }> {
    // If the hardware ID is blocked/generic, treat as no installation found
    if (isHardwareIdBlocked(device_hardware_id)) {
      console.warn(
        `Blocked hardware ID provided to checkExistingInstallation: ${device_hardware_id}`,
      );
      return {
        exists: false,
      };
    }

    // First check in dailycheckapp_school table
    // Include records where is_active is NOT false (true, null, or undefined)
    const school = await this.prisma.dailycheckapp_school.findFirst({
      where: {
        device_hardware_id,
        OR: [{ is_active: null }, { is_active: true }],
      },
    });
    if (school) {
      // Fetch school information from the school table
      let schoolInfo = null;
      let externalSchoolId = null;
      if (school.giga_id_school) {
        const schoolData = await this.prisma.school.findFirst({
          where: {
            giga_id_school: school.giga_id_school,
            deleted: null,
          },
        });

        // Format school data to DTO structure
        if (schoolData) {
          externalSchoolId = schoolData.external_id;
          schoolInfo = {
            id: parseInt(schoolData.id.toString()),
            school_id: schoolData.external_id,
            code: '',
            name: schoolData.name,
            country_id: schoolData.country_id,
            country: schoolData.country_code,
            location_id: schoolData.location_id,
            address: schoolData.address,
            email: schoolData.email,
            postal_code: schoolData.postal_code,
            education_level: schoolData.education_level,
            environment: schoolData.environment,
            admin_1_name: schoolData.admin_1_name,
            admin_2_name: schoolData.admin_2_name,
            admin_3_name: schoolData.admin_3_name,
            admin_4_name: schoolData.admin_4_name,
            giga_id_school: schoolData.giga_id_school,
          };
        }
      }

      return {
        exists: true,
        user_id: school.user_id,
        school_id: externalSchoolId,
        giga_id_school: school.giga_id_school,
        mac_address: school.mac_address,
        os: school.os,
        ip_address: school.ip_address,
        app_version: school.app_version,
        country_code: school.country_code,
        source: 'dailycheckapp_school',
        schoolInfo: schoolInfo,
        is_active: school.is_active,
      };
    }

    // If not found, check in measurements table
    const measurement = await this.prisma.measurements.findFirst({
      where: { device_hardware_id },
      orderBy: { timestamp: 'desc' }, // Get the most recent measurement
    });

    if (measurement && measurement.browser_id) {
      // Try to find a school with matching user_id (browser_id maps to user_id)
      // Include records where is_active is NOT false (true, null, or undefined)
      const schoolByBrowserId =
        await this.prisma.dailycheckapp_school.findFirst({
          where: {
            user_id: measurement.browser_id,
            OR: [{ is_active: null }, { is_active: true }],
          },
        });

      if (schoolByBrowserId) {
        // Fetch school information from the school table
        let schoolInfo = null;
        let externalSchoolId = null;
        if (schoolByBrowserId.giga_id_school) {
          const schoolData = await this.prisma.school.findFirst({
            where: {
              giga_id_school: schoolByBrowserId.giga_id_school,
              deleted: null,
            },
          });

          // Format school data to DTO structure
          if (schoolData) {
            externalSchoolId = schoolData.external_id;
            schoolInfo = {
              id: parseInt(schoolData.id.toString()),
              school_id: schoolData.external_id,
              code: '',
              name: schoolData.name,
              country_id: schoolData.country_id,
              country: schoolData.country_code,
              location_id: schoolData.location_id,
              address: schoolData.address,
              email: schoolData.email,
              postal_code: schoolData.postal_code,
              education_level: schoolData.education_level,
              environment: schoolData.environment,
              admin_1_name: schoolData.admin_1_name,
              admin_2_name: schoolData.admin_2_name,
              admin_3_name: schoolData.admin_3_name,
              admin_4_name: schoolData.admin_4_name,
              giga_id_school: schoolData.giga_id_school,
            };
          }
        }

        return {
          exists: true,
          user_id: schoolByBrowserId.user_id,
          school_id: externalSchoolId,
          giga_id_school: schoolByBrowserId.giga_id_school,
          mac_address: schoolByBrowserId.mac_address,
          os: schoolByBrowserId.os,
          ip_address: schoolByBrowserId.ip_address,
          app_version: schoolByBrowserId.app_version,
          country_code: schoolByBrowserId.country_code,
          source: 'measurements',
          schoolInfo: schoolInfo,
          is_active: schoolByBrowserId.is_active,
          is_verified: await this.resolveIsVerified(
            schoolByBrowserId.giga_id_school,
          ),
        };
      }
    }

    // No installation found
    return {
      exists: false,
    };
  }

  async checkDeviceStatus(
    device_hardware_id: string,
    giga_id_school: string,
  ): Promise<{ is_active: boolean; message: string; exists: boolean }> {
    // If the hardware ID is blocked/generic, treat as active (allow operation)
    if (isHardwareIdBlocked(device_hardware_id)) {
      console.warn(
        `Blocked hardware ID provided to checkDeviceStatus: ${device_hardware_id}`,
      );
      return {
        is_active: true,
        message: 'Device not found (blocked hardware ID)',
        exists: false,
      };
    }

    // Find the latest installation based on created timestamp
    const school = await this.prisma.dailycheckapp_school.findFirst({
      where: {
        device_hardware_id,
        giga_id_school:
          giga_id_school == null
            ? giga_id_school
            : normalizeGigaId(giga_id_school),
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    if (!school) {
      // For backward compatibility, if no record exists, treat as active (not deactivated)
      return {
        is_active: true,
        message: 'Device not found',
        exists: false,
      };
    }

    // Only consider device deactivated if is_active is explicitly false
    // Treat true, null, or undefined as active (for backward compatibility)
    if (school.is_active === false) {
      return {
        is_active: false,
        message: 'Device has been deactivated',
        exists: true,
      };
    }

    // Device is active (is_active is true, null, or undefined)
    return {
      is_active: true,
      message: 'Device is active',
      exists: true,
    };
  }

  async deactivateDevice(
    device_hardware_id: string,
    giga_id_school: string,
  ): Promise<{ deactivated: boolean; message?: string }> {
    // If the hardware ID is blocked/generic, don't perform deactivation
    // if (isHardwareIdBlocked(device_hardware_id)) {
    //   console.warn(
    //     `Blocked hardware ID provided to deactivateDevice: ${device_hardware_id}`,
    //   );
    //   return {
    //     deactivated: false,
    //     message: 'Cannot deactivate device with blocked/generic hardware ID',
    //   };
    // }

    // Find the record where hardware_id + giga_id_school + is_active is true (or null/undefined)
    const result = await this.prisma.dailycheckapp_school.updateMany({
      where: {
        device_hardware_id,
        giga_id_school:
          giga_id_school == null
            ? giga_id_school
            : normalizeGigaId(giga_id_school),
        OR: [{ is_active: null }, { is_active: true }],
      },
      data: {
        is_active: false,
      },
    });

    if (result.count > 0) {
      return {
        deactivated: true,
        message: `Successfully deactivated ${result.count} device(s)`,
      };
    }

    return {
      deactivated: false,
      message:
        'No active device found with the provided hardware_id and giga_id_school',
    };
  }

  async resolveIsVerified(giga_id_school?: string | null): Promise<boolean> {
    const normalizedGigaId =
      giga_id_school == null ? giga_id_school : normalizeGigaId(giga_id_school);

    if (!normalizedGigaId) {
      return false;
    }

    const school = await this.prisma.school.findFirst({
      where: {
        giga_id_school: normalizedGigaId,
        deleted: null,
      },
      select: {
        not_verified: true,
      },
    });

    if (school) {
      return school.not_verified !== true;
    }

    const registration = await this.prisma.school_new_registration.findFirst({
      where: {
        giga_id_school: normalizedGigaId,
        deleted: null,
      },
      select: {
        id: true,
      },
    });

    if (registration) {
      return false;
    }

    return false;
  }

  private async toDto(school: School): Promise<SchoolDto> {
    return {
      id: school.id.toString(),
      user_id: school.user_id,
      giga_id_school: school.giga_id_school,
      mac_address: school.mac_address,
      os: school.os,
      app_version: school.app_version,
      created: school.created,
      network_information: school.network_information,
      ip_address: school.ip_address,
      country_code: school.country_code,
      is_blocked: school.is_blocked,
      created_at: school.created_at,
      device_hardware_id: school.device_hardware_id,
      is_active: school.is_active,
      windows_username: school.windows_username,
      installed_path: school.installed_path,
      wifi_connections: school.wifi_connections
        ? JSON.parse(JSON.stringify(school.wifi_connections))
        : undefined,
      is_verified: await this.resolveIsVerified(school.giga_id_school),
      // The serials and the Windows install ID are never returned.
      device_id: school.device_id ?? undefined,
    };
  }

  private toModel(school: SchoolDto): any {
    return {
      user_id: school?.user_id || uuidv4(),
      ...this.registrationKey(school),
      mac_address: school.mac_address,
      os: school.os,
      app_version: school.app_version,
      created: school.created,
      ip_address: school.ip_address,
      country_code: school.country_code,
      detected_latitude: school.geolocation?.location?.lat || null,
      detected_longitude: school.geolocation?.location?.lng || null,
      detected_location_accuracy: school.detected_location_accuracy || null,
      detected_location_distance: school.detected_location_distance || null,
      detected_location_is_flagged: school.detected_location_is_flagged || null,
      is_active: school.is_active,
      windows_username: school.windows_username,
      installed_path: school.installed_path,
      wifi_connections: school.wifi_connections,
    };
  }
}
