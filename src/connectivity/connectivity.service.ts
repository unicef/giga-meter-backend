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
import { parseRegistrationId } from 'src/registration/registration-id';
import { v1SchoolScope } from 'src/common/facility-scope';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

const isDuplicateRecord = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === UNIQUE_CONSTRAINT_VIOLATION;

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
    if ((await existSchool(this.prisma, giga_id_school)) === false)
      throw new BadRequestException('School does not exist');
    const storedSchoolId = this.storedSchoolId(giga_id_school);
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
        `Failed to store connectivity checks for ${giga_id_school}`,
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

    const gigaIdSchool = this.storedSchoolId(dto.giga_id_school) || null;
    const gigaIdHealth = normalizeHealthId(dto.giga_id_health) || null;

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
        records: data,
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
    return await this.prisma.connectivity_ping_checks.findFirst({
      where: {
        id,
        AND: [v1SchoolScope()],
      },
    });
  }
}
