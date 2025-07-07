import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { dailycheckapp_school as School } from '@prisma/client';
import { SchoolDto } from './school.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SchoolService {
  constructor(private prisma: PrismaService) {}

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
    
    const schools = this.prisma.dailycheckapp_school.findMany({
      skip,
      take,
      where: filter,
      orderBy: { created: 'desc' },
    });
    return (await schools).map(this.toDto);
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

    const schools = this.prisma.dailycheckapp_school.findMany(query);
    return (await schools).map(this.toDto);
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

    const schools = this.prisma.dailycheckapp_school.findMany(query);
    return (await schools).map(this.toDto);
  }

  async schoolsByCountryId(country_code: string): Promise<SchoolDto[]> {
    const schools = this.prisma.dailycheckapp_school.findMany({
      where: { country_code },
    });
    return (await schools).map(this.toDto);
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

  async createSchool(schoolDto: SchoolDto): Promise<string> {
    const model = this.toModel(schoolDto);
    const school = await this.prisma.dailycheckapp_school.create({
      data: model,
    });
    return school.user_id;
  }

  private toDto(school: School): SchoolDto {
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
    };
  }

  private toModel(school: SchoolDto): any {
    return {
      user_id: school?.user_id || uuidv4(),
      giga_id_school: school.giga_id_school?.toLowerCase().trim(),
      mac_address: school.mac_address,
      os: school.os,
      app_version: school.app_version,
      created: school.created,
      ip_address: school.ip_address,
      country_code: school.country_code,
    };
  }
}
