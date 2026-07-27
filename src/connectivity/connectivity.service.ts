import { BadRequestException, Injectable } from '@nestjs/common';
import {
  CreateConnectivityDto,
  GetConnectivityRecordsWithSchoolDto,
} from './connectivity.dto';
import {
  ConnectivityV2ResponseDto,
  CreateConnectivityV2Dto,
} from './connectivity.v2.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { FacilityTypeService } from 'src/facility-type/facility-type.service';
import { RegistrationService } from 'src/registration/registration.service';
import { existSchool } from 'src/utility/utility';

@Injectable()
export class ConnectivityService {
  constructor(
    private prisma: PrismaService,
    private facilityTypeService: FacilityTypeService,
    private registrationService: RegistrationService,
  ) {}
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
        },
      });
      return createConnectivityDto;
    } catch (error) {
      console.log(error);
      throw new BadRequestException('School does not exist');
    }
  }

  async createMany(
    createConnectivityDto: CreateConnectivityDto[],
    giga_id_school: string,
  ) {
    if ((await existSchool(this.prisma, giga_id_school)) === false)
      throw new BadRequestException('School does not exist');
    try {
      await this.prisma.connectivity_ping_checks.createMany({
        data: createConnectivityDto.map((record) => ({
          ...record,
          giga_id_school,
        })),
      });
      return createConnectivityDto;
    } catch (error) {
      console.log(error);
      throw new BadRequestException('School does not exist');
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

    const gigaIdSchool = dto.giga_id_school?.trim() || null;
    const gigaIdHealth = dto.giga_id_health?.trim() || null;

    let registrationId: bigint | null = null;
    if (dto.registration_id != null && dto.registration_id !== '') {
      registrationId = BigInt(dto.registration_id.toString());
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
          giga_id_school,
          timestamp: {
            gte: start_time,
            lte: end_time,
          },
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
      console.log(error);
      throw new BadRequestException('School does not exist');
    }
  }

  async findOne(id: number) {
    return await this.prisma.connectivity_ping_checks.findUnique({
      where: {
        id,
      },
    });
  }
}
