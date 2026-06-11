import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EntityTypeService } from '../entity-type/entity-type.service';
import { HealthService } from '../health/health.service';
import {
  CreateRegistrationDto,
  RegistrationResponseDto,
} from './registration.dto';

@Injectable()
export class RegistrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entityTypeService: EntityTypeService,
    private readonly healthService: HealthService,
  ) {}

  async createRegistration(
    dto: CreateRegistrationDto,
  ): Promise<RegistrationResponseDto> {
    // 1. Validate: exactly one entity ID must be present
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

    const entityCode: 'school' | 'health' = dto.giga_id_health
      ? 'health'
      : 'school';

    // 2. Resolve entity_type row
    const entityType = await this.entityTypeService.getByCode(entityCode);
    if (!entityType) {
      throw new NotFoundException(
        `entity_type "${entityCode}" not found — ensure seed data has been applied`,
      );
    }

    // 3. Look up and validate the facility
    let facilityDbId: bigint;
    let gigaId: string;
    let schoolDbId: bigint | null = null;
    let healthDbId: bigint | null = null;

    if (entityCode === 'health') {
      const facility = await this.healthService.findActiveById(dto.giga_id_health);
      if (!facility) {
        throw new NotFoundException(
          `Health facility "${dto.giga_id_health}" not found or is deleted`,
        );
      }
      facilityDbId = facility.id;
      gigaId = facility.health_id_giga;
      healthDbId = facility.id;
    } else {
      // School — look up in the master `school` table
      const school = await this.prisma.school.findFirst({
        where: { giga_id_school: dto.giga_id_school, deleted: null },
      });
      if (!school) {
        throw new NotFoundException(
          `School "${dto.giga_id_school}" not found or is deleted`,
        );
      }
      facilityDbId = school.id;
      gigaId = school.giga_id_school ?? dto.giga_id_school;
      schoolDbId = school.id;
    }

    // 4. Check country_entity_type_whitelist
    const whitelistEntry =
      await this.prisma.country_entity_type_whitelist.findFirst({
        where: {
          country_code: dto.country_code,
          entity_type_id: entityType.id,
        },
      });
    if (!whitelistEntry) {
      throw new ForbiddenException(
        `Entity type "${entityCode}" is not enabled for country "${dto.country_code}"`,
      );
    }

    // 5. Create the registration row
    const now = new Date().toISOString();
    const registration = await this.prisma.registration.create({
      data: {
        entity_type_id: entityType.id,
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
      registration_id: registration.id.toString(), // BigInt → string
      entity_type: entityType.name,
    };
  }
}
