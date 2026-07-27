import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { health } from '@prisma/client';
import { HealthDetailDto, HealthListItemDto } from './health.dto';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // List
  // ---------------------------------------------------------------------------

  async findAll(
    skip: number,
    take: number,
    orderBy: string,
    country_code?: string,
    write_access?: boolean,
    allowed_countries?: string[],
    govt_id?: string,
  ): Promise<HealthListItemDto[]> {
    const where: Record<string, any> = {
      deleted: null,
    };

    if (country_code) {
      where.country_code = country_code;
    } else if (!write_access && allowed_countries?.length) {
      where.country_code = { in: allowed_countries };
    }

    // The "government ID" a user types can live in any of the three
    // source-system columns; match all of them.
    if (govt_id) {
      where.OR = [
        { dhis2_id: govt_id },
        { hims_id: govt_id },
        { hfml_id: govt_id },
      ];
    }

    const orderField = orderBy.replace('-', '');
    const orderDir: 'asc' | 'desc' = orderBy.startsWith('-') ? 'desc' : 'asc';

    const rows = await this.prisma.health.findMany({
      where,
      skip,
      take,
      orderBy: { [orderField]: orderDir },
    });

    return rows.map(this.toListDto);
  }

  // ---------------------------------------------------------------------------
  // Detail by giga_id
  // ---------------------------------------------------------------------------

  async findByGigaId(
    giga_id: string,
    write_access?: boolean,
    allowed_countries?: string[],
  ): Promise<HealthDetailDto> {
    const where: Record<string, any> = {
      health_id_giga: giga_id,
      deleted: null,
    };

    if (!write_access && allowed_countries?.length) {
      where.country_code = { in: allowed_countries };
    }

    const row = await this.prisma.health.findFirst({ where });

    if (!row) {
      throw new NotFoundException(
        `No active health facility found for giga_id "${giga_id}"`,
      );
    }

    return this.toDetailDto(row);
  }

  // ---------------------------------------------------------------------------
  // Internal lookup (used by health-registration)
  // ---------------------------------------------------------------------------

  async findActiveById(health_id_giga: string): Promise<health | null> {
    return this.prisma.health.findFirst({
      where: { health_id_giga, deleted: null },
    });
  }

  // ---------------------------------------------------------------------------
  // Mappers
  // ---------------------------------------------------------------------------

  private toListDto(h: health): HealthListItemDto {
    return {
      id: h.id.toString(),
      health_id_giga: h.health_id_giga,
      facility_name: h.facility_name,
      dhis2_id: h.dhis2_id,
      facility_level: h.facility_level,
      facility_type_govt: h.facility_type_govt,
      facility_ownership_govt: h.facility_ownership_govt,
      latitude: h.latitude,
      longitude: h.longitude,
      country_code: h.country_code,
      admin1: h.admin1,
      admin2: h.admin2,
      is_facility_open: h.is_facility_open,
      connectivity: h.connectivity,
      electricity_availability: h.electricity_availability,
    };
  }

  private toDetailDto(h: health): HealthDetailDto {
    return {
      ...this.toListDto(h),
      num_staff: h.num_staff,
      pop_within_5km: h.pop_within_5km,
    };
  }
}
