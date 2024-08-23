import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { dailycheckapp_school as School } from '@prisma/client';
import { SchoolMasterDto } from './school-master.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SchoolMasterService {
  constructor(private prisma: PrismaService) {}

  async schools(
    skip?: number,
    take?: number,
    write_access?: boolean,
    countries?: string[],
  ): Promise<SchoolMasterDto[]> {
    const filter = {
      country_code: { in: countries },
    };

    if (write_access) {
      delete filter.country_code;
    }

    const schools = this.prisma.dailycheckapp_school.findMany({
      skip,
      take,
      where: filter,
      orderBy: { created: 'desc' },
    });
    return (await schools).map(this.toDto);
  }

  async schoolsById(
    id: string,
    write_access?: boolean,
    countries?: string[],
  ): Promise<SchoolMasterDto[]> {
    const query = {
      where: {
        id: parseInt(id),
        country_code: { in: countries },
      },
    };
    if (write_access) {
      delete query.where.country_code;
    }

    const schools = this.prisma.dailycheckapp_school.findMany(query);
    return (await schools).map(this.toDto);
  }

  async createSchool(schoolDto: SchoolMasterDto): Promise<string> {
    const model = this.toModel(schoolDto);
    const school = await this.prisma.dailycheckapp_school.create({
      data: model,
    });
    return school.user_id;
  }

  private toDto(school: School): SchoolMasterDto {
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

  private toModel(school: SchoolMasterDto): any {
    return {
      user_id: uuidv4(),
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
