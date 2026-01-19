import { Injectable } from '@nestjs/common';
import { dailycheckapp_school as School } from '@prisma/client';
import { PublicSchoolDto } from './public.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PublicService {
  constructor(private prisma: PrismaService) {}

  async schools(
    skip?: number,
    take?: number,
    giga_id_school?: string,
    country_iso3_code?: string,
    write_access?: boolean,
    countries?: string[],
  ): Promise<PublicSchoolDto[]> {
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

    const schools = this.prisma.dailycheckapp_school.findMany({
      skip,
      take,
      where: filter,
      orderBy: { created: 'desc' },
    });
    return (await schools).map(this.toSchoolDto);
  }
  private toSchoolDto(school: School): PublicSchoolDto {
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
    };
  }
}
