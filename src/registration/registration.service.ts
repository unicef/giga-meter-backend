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
  DeactivateRegistrationDto,
  ExistingRegistrationResponseDto,
  RegistrationStatusResponseDto,
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
        windows_username: dto.windows_username,
        installed_path: dto.installed_path,
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

  /**
   * GET /api/v2/registration/existing — resolve an existing registration from
   * whatever identifiers the client still has, using the priority chain
   * `installation_id → device_hardware_id → giga_id (+ browser_id)`.
   *
   * v1 never returned a registration_id, so legacy installs recover theirs
   * here on first launch after update (frontend "reconciliation"). The oldest
   * vintages only have `giga_id` + `browser_id` (stored as `user_id` in v1
   * registrations).
   */
  async findExisting(keys: {
    installation_id?: string;
    device_hardware_id?: string;
    giga_id?: string;
    browser_id?: string;
  }): Promise<ExistingRegistrationResponseDto> {
    const { installation_id, device_hardware_id, giga_id, browser_id } = keys;
    if (!installation_id && !device_hardware_id && !giga_id) {
      throw new BadRequestException(
        'At least one of installation_id, device_hardware_id or giga_id must be provided',
      );
    }

    const chain: Record<string, any>[] = [];
    if (installation_id) {
      chain.push({ installation_id });
    }
    if (device_hardware_id) {
      chain.push({ device_hardware_id });
    }
    if (giga_id) {
      const byGiga: Record<string, any> = {
        OR: [{ giga_id_school: giga_id }, { giga_id_health: giga_id }],
      };
      if (browser_id) {
        byGiga.user_id = browser_id;
      }
      chain.push(byGiga);
    }

    for (const where of chain) {
      const registration = await this.prisma.registration.findFirst({
        where,
        orderBy: { id: 'desc' },
        include: { facility_type: true },
      });
      if (registration) {
        return this.toExistingDto(registration);
      }
    }

    // v1 registrations live in `dailycheckapp_school`, not in `registration`
    // — backfill-on-read so the legacy fleet can recover its registration
    // (backend doc §5 "legacy linking" / frontend guide §10.6).
    const backfilled = await this.backfillFromLegacy(keys);
    if (backfilled) {
      return this.toExistingDto(backfilled);
    }

    throw new NotFoundException(
      'No registration matches the provided identifiers',
    );
  }

  private toExistingDto(registration: any): ExistingRegistrationResponseDto {
    return {
      registration_id: registration.id.toString(),
      facility_type: registration.facility_type.code,
      giga_id:
        registration.giga_id_school ?? registration.giga_id_health ?? null,
      is_active: registration.is_active,
      is_blocked: registration.is_blocked,
    };
  }

  /**
   * Look the device up in the v1 table (`dailycheckapp_school`) and lazily
   * materialize a v2 `registration` row from it. v1 only ever registered
   * schools. Search order mirrors the recovery chain minus installation_id
   * (v1 never stored one): device_hardware_id → giga + browser_id → giga.
   * Returns the registration (with facility_type relation) or null.
   */
  private async backfillFromLegacy(keys: {
    installation_id?: string;
    device_hardware_id?: string;
    giga_id?: string;
    browser_id?: string;
  }): Promise<any | null> {
    const chain: Record<string, any>[] = [];
    if (keys.device_hardware_id) {
      chain.push({ device_hardware_id: keys.device_hardware_id });
    }
    if (keys.giga_id && keys.browser_id) {
      chain.push({ giga_id_school: keys.giga_id, user_id: keys.browser_id });
    }
    if (keys.giga_id) {
      chain.push({ giga_id_school: keys.giga_id });
    }

    let legacy: any = null;
    for (const where of chain) {
      legacy = await this.prisma.dailycheckapp_school.findFirst({
        where,
        orderBy: { id: 'desc' },
      });
      if (legacy) {
        break;
      }
    }
    if (!legacy?.giga_id_school) {
      return null;
    }

    const facilityType = await this.facilityTypeService.getByCode('school');
    if (!facilityType) {
      return null;
    }

    // Idempotency: a previous backfill (or a concurrent call) may already
    // have materialized this exact legacy row.
    const already = await this.prisma.registration.findFirst({
      where: {
        giga_id_school: legacy.giga_id_school,
        device_hardware_id: legacy.device_hardware_id,
        user_id: legacy.user_id,
      },
      orderBy: { id: 'desc' },
      include: { facility_type: true },
    });
    if (already) {
      return already;
    }

    const school = await this.prisma.school.findFirst({
      where: { giga_id_school: legacy.giga_id_school, deleted: null },
    });

    return this.prisma.registration.create({
      data: {
        facility_type_id: facilityType.id,
        school_id: school?.id ?? null,
        giga_id_school: legacy.giga_id_school,
        // Stamp the caller's installation_id so the next lookup resolves
        // directly through the first rung of the chain.
        installation_id: keys.installation_id ?? null,
        user_id: legacy.user_id,
        mac_address: legacy.mac_address,
        os: legacy.os,
        app_version: legacy.app_version,
        device_hardware_id: legacy.device_hardware_id,
        ip_address: legacy.ip_address,
        network_information: legacy.network_information,
        windows_username: legacy.windows_username,
        installed_path: legacy.installed_path,
        wifi_connections: legacy.wifi_connections ?? undefined,
        country_code: legacy.country_code,
        created: new Date().toISOString(),
        is_blocked: legacy.is_blocked,
        is_active: legacy.is_active,
        notify: false,
      },
      include: { facility_type: true },
    });
  }

  /**
   * Ingest self-heal (backend doc §5 "resolve or lazily create"): resolve a
   * measurement/connectivity record's registration from whatever identifiers
   * it carries. Never throws — an unresolvable record keeps
   * registration_id = null rather than being rejected.
   *
   * Order: v2 chain (non-blocked) → legacy backfill (school-only) →
   * lazy-create, but only when the giga_id is VALID (facility exists) so
   * junk traffic never mints registrations.
   */
  async resolveForIngest(keys: {
    installation_id?: string;
    device_hardware_id?: string;
    giga_id_school?: string;
    giga_id_health?: string;
    browser_id?: string;
    country_code?: string;
  }): Promise<bigint | null> {
    try {
      const gigaId = keys.giga_id_school ?? keys.giga_id_health;
      const chain: Record<string, any>[] = [];
      if (keys.installation_id) {
        chain.push({ installation_id: keys.installation_id });
      }
      if (keys.device_hardware_id) {
        chain.push({ device_hardware_id: keys.device_hardware_id });
      }
      if (gigaId) {
        const byGiga: Record<string, any> = {
          OR: [{ giga_id_school: gigaId }, { giga_id_health: gigaId }],
        };
        if (keys.browser_id) {
          byGiga.user_id = keys.browser_id;
        }
        chain.push(byGiga);
      }

      for (const where of chain) {
        const registration = await this.prisma.registration.findFirst({
          where: { ...where, is_blocked: false },
          orderBy: { id: 'desc' },
          select: { id: true },
        });
        if (registration) {
          return registration.id;
        }
      }

      if (!keys.giga_id_health) {
        const backfilled = await this.backfillFromLegacy({
          installation_id: keys.installation_id,
          device_hardware_id: keys.device_hardware_id,
          giga_id: keys.giga_id_school,
          browser_id: keys.browser_id,
        });
        if (backfilled && !backfilled.is_blocked) {
          return backfilled.id;
        }
      }

      return await this.lazyCreateFromIngest(keys);
    } catch (error) {
      // Self-heal must never break ingestion.
      console.error('resolveForIngest failed:', error);
      return null;
    }
  }

  private async lazyCreateFromIngest(keys: {
    installation_id?: string;
    device_hardware_id?: string;
    giga_id_school?: string;
    giga_id_health?: string;
    country_code?: string;
  }): Promise<bigint | null> {
    if (keys.giga_id_health) {
      const facility = await this.healthService.findActiveById(
        keys.giga_id_health,
      );
      if (!facility) {
        return null;
      }
      const facilityType = await this.facilityTypeService.getByCode('health');
      if (!facilityType) {
        return null;
      }
      const created = await this.prisma.registration.create({
        data: {
          facility_type_id: facilityType.id,
          health_id: facility.id,
          giga_id_health: facility.health_id_giga,
          installation_id: keys.installation_id ?? null,
          device_hardware_id: keys.device_hardware_id ?? null,
          country_code: keys.country_code ?? facility.country_code ?? null,
          created: new Date().toISOString(),
          is_blocked: false,
          notify: false,
        },
      });
      return created.id;
    }

    if (keys.giga_id_school) {
      const school = await this.prisma.school.findFirst({
        where: { giga_id_school: keys.giga_id_school, deleted: null },
      });
      if (!school) {
        return null;
      }
      const facilityType = await this.facilityTypeService.getByCode('school');
      if (!facilityType) {
        return null;
      }
      const created = await this.prisma.registration.create({
        data: {
          facility_type_id: facilityType.id,
          school_id: school.id,
          giga_id_school: school.giga_id_school,
          installation_id: keys.installation_id ?? null,
          device_hardware_id: keys.device_hardware_id ?? null,
          country_code: keys.country_code ?? school.country_code ?? null,
          created: new Date().toISOString(),
          is_blocked: false,
          notify: false,
        },
      });
      return created.id;
    }

    return null;
  }

  /** GET /api/v2/registration/status — device status by installation_id. */
  async getStatus(
    installation_id: string,
  ): Promise<RegistrationStatusResponseDto> {
    if (!installation_id) {
      throw new BadRequestException('installation_id is required');
    }
    const registration = await this.prisma.registration.findFirst({
      where: { installation_id },
      orderBy: { id: 'desc' },
    });
    if (!registration) {
      return { exists: false, is_active: null, is_blocked: null };
    }
    return {
      exists: true,
      is_active: registration.is_active,
      is_blocked: registration.is_blocked,
    };
  }

  /** POST /api/v2/registration/deactivate — logout for any facility type. */
  async deactivate(dto: DeactivateRegistrationDto): Promise<{ success: true }> {
    if (!dto.installation_id && !dto.registration_id) {
      throw new BadRequestException(
        'At least one of installation_id or registration_id must be provided',
      );
    }

    const where: Record<string, any> = dto.registration_id
      ? { id: BigInt(dto.registration_id) }
      : { installation_id: dto.installation_id };

    const registration = await this.prisma.registration.findFirst({
      where,
      orderBy: { id: 'desc' },
    });
    if (!registration) {
      throw new NotFoundException(
        'No registration matches the provided identifiers',
      );
    }

    await this.prisma.registration.update({
      where: { id: registration.id },
      data: { is_active: false },
    });

    return { success: true };
  }
}
