import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FacilityTypeService } from '../facility-type/facility-type.service';
import { HealthService } from '../health/health.service';
import {
  CreateRegistrationDto,
  RegistrationV2ResponseDto,
} from './registration.v2.dto';

@Injectable()
export class RegistrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly facilityTypeService: FacilityTypeService,
    private readonly healthService: HealthService,
  ) {}

  async createRegistration(
    dto: CreateRegistrationDto,
  ): Promise<RegistrationV2ResponseDto> {
    if (!dto.giga_id_school && !dto.giga_id_health) {
      throw new BadRequestException(
        'Exactly one of giga_id_school or giga_id_health must be provided',
      );
    }
    if (dto.giga_id_school && dto.giga_id_health) {
      throw new BadRequestException(
        'Only one of giga_id_school or giga_id_health may be provided, not both',
      );
    }

    const facilityCode: 'school' | 'health' = dto.giga_id_health
      ? 'health'
      : 'school';

    const facilityType = await this.facilityTypeService.getByCode(facilityCode);
    if (!facilityType) {
      throw new NotFoundException(
        `facility_type "${facilityCode}" not found — ensure seed data has been applied`,
      );
    }

    let gigaId: string;
    let schoolDbId: bigint | null = null;
    let healthDbId: bigint | null = null;

    if (facilityCode === 'health') {
      const facility = await this.healthService.findActiveById(dto.giga_id_health);
      if (!facility) {
        throw new NotFoundException(
          `Health facility "${dto.giga_id_health}" not found or is deleted`,
        );
      }
      gigaId = facility.health_id_giga;
      healthDbId = facility.id;
    } else {
      const school = await this.prisma.school.findFirst({
        where: { giga_id_school: dto.giga_id_school, deleted: null },
      });
      if (!school) {
        throw new NotFoundException(
          `School "${dto.giga_id_school}" not found or is deleted`,
        );
      }
      gigaId = school.giga_id_school ?? dto.giga_id_school;
      schoolDbId = school.id;
    }

    const whitelistEntry =
      await this.prisma.country_facility_type_whitelist.findFirst({
        where: {
          country_code: dto.country_code,
          facility_type_id: facilityType.id,
        },
      });
    if (!whitelistEntry) {
      throw new ForbiddenException(
        `Facility type "${facilityCode}" is not enabled for country "${dto.country_code}"`,
      );
    }

    const now = new Date().toISOString();
    const registration = await this.prisma.registration.create({
      data: {
        facility_type_id: facilityType.id,
        school_id: schoolDbId,
        health_id: healthDbId,
        giga_id_school: schoolDbId ? gigaId : null,
        giga_id_health: healthDbId ? gigaId : null,
        installation_id: dto.installation_id,
        user_id: dto.user_id,
        os: dto.os,
        app_version: dto.app_version,
        mac_address: dto.mac_address,
        device_hardware_id: dto.device_hardware_id,
        ip_address: dto.ip_address,
        network_information: dto.network_information,
        country_code: dto.country_code,
        wifi_connections: dto.wifi_connections
          ? (dto.wifi_connections as unknown as any)
          : undefined,
        created: now,
        is_blocked: false,
        notify: false,
      },
    });

    return {
      giga_id: gigaId,
      registration_id: registration.id.toString(),
      facility_type: facilityCode,
    };
  }
}
