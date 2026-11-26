import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AnalyticsService,
  DEVICE_REGISTRATIONS_ANOMALY,
} from '../analytics/analytics.service';
import { Prisma, dailycheckapp_school as School } from '@prisma/client';
import { normalizeAppInstanceId } from '../common/app-instance.utils';
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

/** The school, hardware ID and app instance a registration is for, as stored. */
interface RegistrationKey {
  giga_id_school?: string;
  device_hardware_id?: string;
  app_instance_id?: string;
}

/** How the app came to register: the values registration_source can hold. */
const REGISTRATION_SOURCES = ['manual', 'auto'];

/**
 * The app instance ID a registration sent, lowercased, or undefined when it
 * sent none (apps before app instances). Anything else is refused, rather than
 * quietly treated as none, because then the registration would be matched by
 * the old rule instead of by its instance.
 */
function appInstanceId(value: unknown): string | undefined {
  if (value == null || value === '') {
    return undefined;
  }
  const normalized = normalizeAppInstanceId(value);
  if (normalized == null) {
    throw new BadRequestException('app_instance_id must be a UUID');
  }
  return normalized;
}

/** A unique index refused the insert: here, only app_instance_id's. */
function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

@Injectable()
export class SchoolService {
  constructor(
    private prisma: PrismaService,
    private readonly geolocationUtility: GeolocationUtility,
    private readonly deviceIdService: DeviceIdService,
    @Optional() private readonly analytics?: AnalyticsService,
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
    // exception is a registration without a device ID yet, which gets the
    // hardware values and device ID (fillInDevice).
    //
    // The device ID (TECH-8828) is worked out and stored, but nothing acts on
    // it yet: a repeat is decided by the app instance, or as before
    // (findRepeat).
    //
    // An app that sends an app instance ID gets a row of its own for every app
    // instance, with that instance's own context, including when it registers
    // by itself on a PC that already has a registration at the school.
    const key = this.registrationKey(schoolDto);
    await this.addGeolocation(schoolDto);
    const { school, repeat } = await this.registerWithDevice(schoolDto, key);
    if (repeat) {
      console.warn(
        `Duplicate registration absorbed for giga_id_school ${key.giga_id_school}, ` +
          (key.app_instance_id
            ? `app_instance_id ${key.app_instance_id}`
            : `device_hardware_id ${key.device_hardware_id}`) +
          `: returning user_id ${school.user_id}`,
      );
    }

    this.reportRegistration(school, schoolDto, repeat);

    return {
      user_id: school.user_id,
      is_verified: await this.resolveIsVerified(school.giga_id_school),
      // The app identifies itself in analytics by it (one PostHog person per
      // physical PC). Null when it could not be worked out.
      device_id: school.device_id ?? null,
    };
  }

  /**
   * server_device_registered: one app instance (this registration row) on a
   * device, manual or automatic. Carries the device ID's flags and how many
   * app instances map to the device, all and still active;
   * DEVICE_REGISTRATIONS_ANOMALY or more in all is flagged as an anomaly
   * (likely several PCs sharing one hardware signature). Not awaited.
   */
  private reportRegistration(
    school: School,
    schoolDto: SchoolDto,
    repeat: boolean,
  ): void {
    if (!this.analytics?.isEnabled()) {
      return;
    }
    const deviceId = school.device_id ?? null;
    const counts: Promise<[number, number] | null> = deviceId
      ? Promise.all([
          this.prisma.dailycheckapp_school.count({
            where: { device_id: deviceId },
          }),
          this.prisma.dailycheckapp_school.count({
            where: { device_id: deviceId, OR: ACTIVE },
          }),
        ]).catch(() => null)
      : Promise.resolve(null);
    void counts.then((found) => {
      const [instances, active] = found ?? [null, null];
      this.analytics.captureDeviceEvent(
        'server_device_registered',
        {
          deviceId,
          gigaId: school.giga_id_school,
          countryCode: school.country_code ?? schoolDto.country_code,
          appInstanceId: school.app_instance_id,
        },
        {
          // Rows from apps before app instances have none: this links them.
          registration_user_id: school.user_id ?? null,
          registration_source: school.registration_source ?? null,
          repeat,
          has_device_id: !!deviceId,
          device_id_flags: school.device_id_flags ?? [],
          app_instances_for_device: instances,
          active_app_instances_for_device: active,
          anomaly:
            typeof instances === 'number' &&
            instances >= DEVICE_REGISTRATIONS_ANOMALY,
          app_version: schoolDto.app_version ?? null,
        },
      );
    });
  }

  /**
   * Returns the repeat or stores a new registration, with its device ID
   * (TECH-8828). If working out the device ID fails for any reason, the
   * registration is still saved, without a device ID, so the device ID can only
   * be missing, never block a school.
   */
  private async registerWithDevice(
    schoolDto: SchoolDto,
    key: RegistrationKey,
  ): Promise<{ school: School; repeat: boolean }> {
    try {
      return await this.withDevice(schoolDto, async (tx, device) => {
        const existing = await this.findRepeat(tx, key);
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
      // An answer for the caller (a 409), not a failure to work around.
      if (error instanceof HttpException) {
        throw error;
      }
      const stored = await this.storedByOtherRequest(key, error);
      if (stored) {
        return stored;
      }
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
   * When an insert hit the unique app_instance_id, another request from the
   * same app instance (a retry, a double tap) stored it first: that row is the
   * answer. Requests from one PC normally wait for each other on its hardware
   * values, but one with no values to lock on doesn't.
   */
  private async storedByOtherRequest(
    key: RegistrationKey,
    error: unknown,
  ): Promise<{ school: School; repeat: boolean } | null> {
    if (!key.app_instance_id || !isUniqueViolation(error)) {
      return null;
    }
    const existing = await this.findRepeat(this.prisma, key);
    return existing ? { school: existing, repeat: true } : null;
  }

  /**
   * The registration without a device ID. The hardware values are still
   * stored, so the device ID can be worked out later.
   */
  private async registerWithoutDevice(
    schoolDto: SchoolDto,
    key: RegistrationKey,
  ): Promise<{ school: School; repeat: boolean }> {
    const existing = await this.findRepeat(this.prisma, key);
    if (existing) {
      return { school: existing, repeat: true };
    }
    const signals = cleanSignals(schoolDto);
    try {
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
    } catch (error) {
      const stored = await this.storedByOtherRequest(key, error);
      if (stored) {
        return stored;
      }
      throw error;
    }
  }

  /**
   * The registration a request repeats, if any.
   *
   * With an app instance ID, it's that instance's registration: the same app
   * instance registering again (a retry, a double tap). Any other registration
   * of the PC at the school isn't a repeat: it's another app instance (another
   * Windows user, a reinstall, a login after a logout), which gets its own row.
   * The same instance at another school is refused with a 409: the app makes a
   * new instance ID when the user picks another school.
   *
   * Without one (apps before app instances), the active registration this
   * device already has for this school, as before 2.0.4: same school, same
   * hardware ID. The device ID isn't used here; nothing acts on it yet.
   *
   * Keyed on device_hardware_id: mac_address is not a hardware address but
   * Capacitor's Device.getId(), which is regenerated on every app relaunch, so
   * it cannot identify a device. registrationKey() has already nulled out the
   * blocked generic ids, so a null here means "cannot be identified" and a new
   * row is the only safe answer. Deactivated rows are ignored, matching
   * checkExistingInstallation: logging out and registering again is a new
   * installation.
   */
  private async findRepeat(
    client: Prisma.TransactionClient,
    key: RegistrationKey,
  ): Promise<School | null> {
    if (key.app_instance_id) {
      const own = await client.dailycheckapp_school.findUnique({
        where: { app_instance_id: key.app_instance_id },
      });
      if (own && own.giga_id_school !== (key.giga_id_school ?? null)) {
        throw new ConflictException(
          'This app instance is already registered at another school',
        );
      }
      return own;
    }
    if (!key.giga_id_school || !key.device_hardware_id) {
      return null;
    }
    return client.dailycheckapp_school.findFirst({
      where: {
        giga_id_school: key.giga_id_school,
        device_hardware_id: key.device_hardware_id,
        OR: ACTIVE,
      },
      // Oldest first: the identity the device has been reporting all along.
      orderBy: { id: 'asc' },
    });
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
   * looks for a repeat or stores a new registration. Two requests for the same
   * PC therefore can't both decide there is none.
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
   * A repeat that has no device ID yet (from before 2.0.4, or saved when
   * working one out failed) gets the hardware values and device ID this PC now
   * sends, so its tests and pings count under the device ID from now on. So
   * does one that assign() has just linked to this PC, which has the device ID
   * but not yet the values, or still the failed flag. Any other registration
   * is returned as it stands: the repeat is found by hardware ID, so one with
   * another device ID may be another PC's with the same firmware UUID.
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
    const complete =
      hasValues && !(row.device_id_flags ?? []).includes(DEVICE_ID_FAILED);
    const needsDevice =
      row.device_id == null ||
      (row.device_id === device.device_id && !complete);
    if (!needsDevice) {
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
   * The school, device and app instance a payload identifies, normalized
   * exactly the way toModel() stores them so the lookup and the insert cannot
   * drift apart.
   */
  private registrationKey(school: SchoolDto): RegistrationKey {
    return {
      giga_id_school:
        school.giga_id_school == null
          ? school.giga_id_school
          : normalizeGigaId(school.giga_id_school),
      device_hardware_id: sanitizeHardwareId(school.device_hardware_id),
      app_instance_id: appInstanceId(school.app_instance_id),
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

    // The app registers this PC at the school it returns, by itself. When the
    // hardware ID has active registrations at two or more schools, it can't say
    // which one this PC is at: one firmware UUID on several PCs, or a PC moved
    // without logging out. Nothing is returned then, and the user picks the
    // school.
    const schools = await this.prisma.dailycheckapp_school.findMany({
      where: {
        device_hardware_id,
        giga_id_school: { not: null },
        OR: ACTIVE,
      },
      distinct: ['giga_id_school'],
      select: { giga_id_school: true },
      take: 2,
    });
    if (schools.length > 1) {
      console.warn(
        `Hardware ID ${device_hardware_id} is active at more than one school; ` +
          'not returning a registration',
      );
      return {
        exists: false,
      };
    }

    // First check in dailycheckapp_school table
    // Include records where is_active is NOT false (true, null, or undefined).
    // A PC has a registration per app instance: the newest is the one in use.
    const school = await this.prisma.dailycheckapp_school.findFirst({
      where: {
        device_hardware_id,
        OR: [{ is_active: null }, { is_active: true }],
      },
      orderBy: { id: 'desc' },
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
    app_instance_id?: string,
  ): Promise<{
    is_active: boolean;
    message: string;
    exists: boolean;
    device_id?: string | null;
  }> {
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
        device_id: school.device_id ?? null,
      };
    }

    // Device is active (is_active is true, null, or undefined). The app checks
    // this at every start, which is how an existing installation learns its
    // device ID without registering again, and a new one when its registration
    // got one later (completed by a measurement). Only the device ID comes
    // from the app instance's own row: the status stays as it was.
    return {
      is_active: true,
      message: 'Device is active',
      exists: true,
      device_id: await this.deviceIdOfInstance(app_instance_id, school),
    };
  }

  /**
   * The device ID of the asking app instance's own registration. Several PCs
   * can share a firmware UUID, so the latest registration for the hardware ID
   * and school can be another PC's: its own row is the one that says which PC
   * this is. The latest registration's when the app sent no app instance ID
   * (or one without a row yet).
   */
  private async deviceIdOfInstance(
    app_instance_id: string | undefined,
    latest: School,
  ): Promise<string | null> {
    const instanceId = normalizeAppInstanceId(app_instance_id);
    if (instanceId && instanceId !== latest.app_instance_id) {
      const own = await this.prisma.dailycheckapp_school.findUnique({
        where: { app_instance_id: instanceId },
        select: { device_id: true },
      });
      if (own) {
        return own.device_id ?? null;
      }
    }
    return latest.device_id ?? null;
  }

  /**
   * Gives the registration with this user_id this app instance's ID: for an
   * install registered before app instances, which has a registration but no
   * ID and doesn't register again. Repeating the same claim is fine.
   *
   * 409 when the registration already has another app instance's ID (older
   * apps copied one registration to every Windows user of a PC, and the first
   * of them to claim it keeps it; the others register on their own), or when
   * this ID already belongs to another registration. 404 when there's no
   * registration with this user_id.
   */
  async claimAppInstance(
    user_id: string,
    app_instance_id: string,
  ): Promise<{ user_id: string; app_instance_id: string }> {
    const instanceId = appInstanceId(app_instance_id);
    const userId = user_id?.trim();
    if (!userId || !instanceId) {
      throw new BadRequestException('user_id and app_instance_id are required');
    }
    const claimed = { user_id: userId, app_instance_id: instanceId };

    const registration = await this.prisma.dailycheckapp_school.findFirst({
      where: { user_id: userId },
      orderBy: { id: 'desc' },
      select: { id: true, app_instance_id: true },
    });
    if (!registration) {
      throw new NotFoundException('No registration with this user_id');
    }
    if (registration.app_instance_id === instanceId) {
      return claimed;
    }
    if (registration.app_instance_id != null) {
      throw new ConflictException(
        'This registration belongs to another app instance',
      );
    }

    try {
      // Only while it has none: two instances claiming at once can't both win.
      const { count } = await this.prisma.dailycheckapp_school.updateMany({
        where: { id: registration.id, app_instance_id: null },
        data: { app_instance_id: instanceId },
      });
      if (count === 0) {
        const now = await this.prisma.dailycheckapp_school.findUnique({
          where: { id: registration.id },
          select: { app_instance_id: true },
        });
        if (now?.app_instance_id !== instanceId) {
          throw new ConflictException(
            'This registration belongs to another app instance',
          );
        }
      }
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          'This app instance ID belongs to another registration',
        );
      }
      throw error;
    }
    return claimed;
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

    // The device ID for the analytics event, read before the rows change.
    const deviceRow = this.analytics?.isEnabled()
      ? await this.prisma.dailycheckapp_school
          .findFirst({
            where: {
              device_hardware_id,
              giga_id_school:
                giga_id_school == null
                  ? giga_id_school
                  : normalizeGigaId(giga_id_school),
            },
            orderBy: { id: 'desc' },
            select: { device_id: true, country_code: true },
          })
          .catch(() => null)
      : null;

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

    // The server side of the app's logout: deactivated=false means the app
    // logged out but the backend still counts the device as active. It works
    // on the PC at the school, not on one app instance: more than one row
    // means other app instances there (other Windows users) were logged out
    // too, and they reset at their next start (device_deactivated_remotely).
    this.analytics?.captureDeviceEvent(
      'server_device_deactivated',
      {
        deviceId: deviceRow?.device_id ?? null,
        gigaId: giga_id_school,
        countryCode: deviceRow?.country_code ?? null,
      },
      {
        deactivated: result.count > 0,
        app_instances_deactivated: result.count,
      },
    );

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
      registration_source: REGISTRATION_SOURCES.includes(
        school.registration_source,
      )
        ? school.registration_source
        : null,
    };
  }
}
