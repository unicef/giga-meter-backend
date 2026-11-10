import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  CreateConnectivityDto,
  GetConnectivityRecordsWithSchoolDto,
} from './connectivity.dto';
import {
  ConnectivityV2ResponseDto,
  CreateConnectivityV2Dto,
} from './connectivity.v2.dto';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { FacilityTypeService } from 'src/facility-type/facility-type.service';
import { RegistrationService } from 'src/registration/registration.service';
import {
  existSchool,
  normalizeGigaId,
  normalizeHealthId,
} from 'src/utility/utility';
import { facilityGigaId } from 'src/facility-type/facility-ids';
import { parseRegistrationId } from 'src/registration/registration-id';
import { toV1PingRecord, v1SchoolScope } from 'src/common/facility-scope';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

const isDuplicateRecord = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === UNIQUE_CONSTRAINT_VIOLATION;

/**
 * The app builds the upload URL from the school id it holds at upload time.
 * Some start-up paths clear that id but keep the queue of pings not yet
 * uploaded, so the queue arrives with the id as the text "undefined".
 */
const isMissingSchoolId = (giga_id_school?: string | null) =>
  ['', 'undefined', 'null'].includes(
    (giga_id_school ?? '').trim().toLowerCase(),
  );

/** How long the app keeps a queued ping before deleting it (cleanupOldRecords). */
const APP_PING_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * The app only runs that cleanup after every batch uploads, and it uploads the
 * oldest batch first and stops at the first failure. A batch we reject is
 * therefore never cleaned up, and it blocks every newer ping on the device.
 */
const isPastAppRetention = (records: CreateConnectivityDto[] = []) => {
  const cutoff = Date.now() - APP_PING_RETENTION_MS;
  return (
    records.length > 0 &&
    records.every(
      (record) =>
        !!record.timestamp && new Date(record.timestamp).getTime() < cutoff,
    )
  );
};

@Injectable()
export class ConnectivityService {
  private readonly logger = new Logger(ConnectivityService.name);

  constructor(
    private prisma: PrismaService,
    private facilityTypeService: FacilityTypeService,
    private registrationService: RegistrationService,
  ) {}

  /** Matches dailycheckapp_school, which stores giga_id_school lowercased. */
  private storedSchoolId(giga_id_school?: string | null): string {
    return normalizeGigaId(giga_id_school);
  }
  async create(createConnectivityDto: CreateConnectivityDto) {
    if (
      (await existSchool(this.prisma, createConnectivityDto.giga_id_school)) ===
      false
    )
      throw new BadRequestException('School does not exist');
    try {
      await this.prisma.connectivity_ping_checks.create({
        data: {
          ...createConnectivityDto,
          giga_id_school: this.storedSchoolId(
            createConnectivityDto.giga_id_school,
          ),
        },
      });
      return createConnectivityDto;
    } catch (error) {
      // The client re-sends its offline queue until the server acknowledges it,
      // so a record we already stored is a success, not a failure.
      if (isDuplicateRecord(error)) return createConnectivityDto;
      this.logger.error(
        `Failed to store connectivity check for ${createConnectivityDto.giga_id_school}`,
        error,
      );
      throw error;
    }
  }

  async createMany(
    createConnectivityDto: CreateConnectivityDto[],
    giga_id_school: string,
  ) {
    const schoolId = isMissingSchoolId(giga_id_school)
      ? await this.schoolOfDevice(createConnectivityDto)
      : giga_id_school;
    // Only reachable without a school id: a given id is used as it is.
    if (!schoolId && isPastAppRetention(createConnectivityDto)) {
      const browserIds = new Set(createConnectivityDto.map((r) => r.browserId));
      this.logger.warn(
        `Dropped ${createConnectivityDto.length} connectivity checks sent without a school id: ` +
          `browserId ${[...browserIds].join(', ')} is not registered to one school, ` +
          `and all are older than the app keeps them`,
      );
      return createConnectivityDto;
    }
    if (!schoolId || (await existSchool(this.prisma, schoolId)) === false)
      throw new BadRequestException('School does not exist');
    if (schoolId !== giga_id_school)
      this.logger.warn(
        `${createConnectivityDto.length} connectivity checks sent without a school id; ` +
          `storing them under ${schoolId}, the school their browserId is registered to`,
      );
    const storedSchoolId = this.storedSchoolId(schoolId);
    try {
      await this.prisma.connectivity_ping_checks.createMany({
        data: createConnectivityDto.map((record) => ({
          ...record,
          giga_id_school: storedSchoolId,
        })),
        // A batch the client already delivered would otherwise fail as a whole
        // on app_local_uuid and stay queued on the device forever.
        skipDuplicates: true,
      });
      return createConnectivityDto;
    } catch (error) {
      this.logger.error(
        `Failed to store connectivity checks for ${schoolId}`,
        error,
      );
      throw error;
    }
  }
  /**
   * POST /api/v2/connectivity — facility-aware ping batch. Keyed on
   * registration_id + facility_type (identifier in the body, not the path).
   * Falls back to resolving the registration from installation_id / giga_id
   * for legacy installs; `app_local_uuid` duplicates are skipped so retries
   * are idempotent.
   */
  async createManyV2(
    dto: CreateConnectivityV2Dto,
  ): Promise<ConnectivityV2ResponseDto> {
    const facilityType = await this.facilityTypeService.getByCode(
      dto.facility_type,
    );
    if (!facilityType) {
      throw new BadRequestException(
        `Unknown facility_type "${dto.facility_type}"`,
      );
    }

    // The id must match the facility type and point at an existing facility.
    const gigaId = facilityGigaId(facilityType.code, dto);
    const gigaIdSchool = facilityType.code === 'school' ? gigaId : null;
    const gigaIdHealth = facilityType.code === 'health' ? gigaId : null;
    const facilityExists = gigaIdSchool
      ? await this.prisma.school.findFirst({
          where: { giga_id_school: gigaIdSchool, deleted: null },
          select: { id: true },
        })
      : await this.prisma.health.findFirst({
          where: { health_id_giga: gigaIdHealth, deleted: null },
          select: { id: true },
        });
    if (!facilityExists) {
      throw new BadRequestException(
        `${facilityType.code === 'school' ? 'School' : 'Health facility'} "${gigaId}" not found`,
      );
    }

    let registrationId: bigint | null = null;
    if (dto.registration_id != null && dto.registration_id !== '') {
      registrationId = parseRegistrationId(dto.registration_id);
      const registration = await this.prisma.registration.findFirst({
        where: { id: registrationId },
      });
      if (!registration) {
        throw new BadRequestException(
          `Registration "${dto.registration_id}" not found`,
        );
      }
      if (registration.is_blocked) {
        throw new BadRequestException(
          `Registration "${dto.registration_id}" is blocked`,
        );
      }
    } else {
      // Self-heal: same chain as GET /api/v2/registration/existing, plus
      // legacy backfill and lazy-create from a valid giga_id.
      registrationId = await this.registrationService.resolveForIngest({
        installation_id: dto.installation_id,
        giga_id_school: gigaIdSchool ?? undefined,
        giga_id_health: gigaIdHealth ?? undefined,
      });
    }

    if (!registrationId && !gigaIdSchool && !gigaIdHealth) {
      throw new BadRequestException(
        'At least one of registration_id, giga_id_school or giga_id_health must be provided',
      );
    }

    const result = await this.prisma.connectivity_ping_checks.createMany({
      data: dto.records.map((record) => ({
        timestamp: record.timestamp,
        isConnected: record.isConnected,
        errorMessage: record.errorMessage ?? null,
        app_local_uuid: record.app_local_uuid,
        latency: record.latency ?? null,
        giga_id_school: gigaIdSchool,
        giga_id_health: gigaIdHealth,
        facility_type_id: facilityType.id,
        registration_id: registrationId,
      })),
      skipDuplicates: true,
    });

    return { success: true, accepted: result.count };
  }

  /**
   * The school the batch's device is registered to. Each ping carries the
   * device's registration id as browserId (the app's schoolUserId, stored as
   * dailycheckapp_school.user_id). A logged-out registration still counts: the
   * pings were taken before the logout. Null unless the whole batch comes from
   * one device registered to exactly one school.
   */
  private async schoolOfDevice(
    records: CreateConnectivityDto[] = [],
  ): Promise<string | null> {
    const browserIds = new Set(
      records.map((record) => record.browserId?.trim()),
    );
    const [browserId] = browserIds;
    if (browserIds.size !== 1 || !browserId) return null;

    const registrations = await this.prisma.dailycheckapp_school.findMany({
      where: { user_id: browserId },
      select: { giga_id_school: true },
    });
    const schools = new Set(
      registrations.map((r) => r.giga_id_school).filter(Boolean),
    );
    return schools.size === 1 ? [...schools][0] : null;
  }

  async findAll(query: GetConnectivityRecordsWithSchoolDto) {
    const {
      giga_id_school,
      page = 1,
      per_page = 10,
      start_time = new Date(0), // 1970-01-01T00:00:00.000Z
      end_time = new Date(), // current date
    } = query;
    try {
      const data = await this.prisma.connectivity_ping_checks.findMany({
        where: {
          giga_id_school: giga_id_school
            ? normalizeGigaId(giga_id_school)
            : giga_id_school,
          timestamp: {
            gte: start_time,
            lte: end_time,
          },
          AND: [v1SchoolScope()],
        },
        skip: (page - 1) * per_page,
        take: per_page * 1,
      });
      return {
        giga_id_school,
        time_range: {
          start_time,
          end_time,
        },
        records: data.map(toV1PingRecord),
      };
    } catch (error) {
      this.logger.error(
        `Failed to read connectivity checks for ${giga_id_school}`,
        error,
      );
      throw error;
    }
  }

  async findOne(id: number) {
    const record = await this.prisma.connectivity_ping_checks.findFirst({
      where: {
        id,
        AND: [v1SchoolScope()],
      },
    });
    return record ? toV1PingRecord(record) : record;
  }
}
