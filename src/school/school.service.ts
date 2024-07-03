import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { dailycheckapp_school as School } from '@prisma/client';
import { SchoolDto } from './school.dto';

@Injectable()
export class SchoolService {
  constructor(private prisma: PrismaService) {}

  async schools(params: {
    skip?: number;
    take?: number;
  }): Promise<SchoolDto[]> {
    const { skip, take } = params;
    const schools = this.prisma.dailycheckapp_school.findMany({
      skip,
      take,
    });
    return (await schools).map(this.toDto);
  }

  async schoolsByGigaId(giga_id_school: string): Promise<SchoolDto[]> {
    const schools = this.prisma.dailycheckapp_school.findMany({
      where: { giga_id_school },
    });
    return (await schools).map(this.toDto);
  }

  async schoolsById(id: string): Promise<SchoolDto[]> {
    const schools = this.prisma.dailycheckapp_school.findMany({
      where: { id: parseInt(id) },
    });
    return (await schools).map(this.toDto);
  }

  async schoolsByCountryId(country_code: string): Promise<SchoolDto[]> {
    const schools = this.prisma.dailycheckapp_school.findMany({
      where: { country_code },
    });
    return (await schools).map(this.toDto);
  }

  async createSchool(schoolDto: SchoolDto): Promise<string> {
    const model = this.toModel(schoolDto);
    const school = await this.prisma.dailycheckapp_school.create({
      data: model,
    });
    return school.id.toString();
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
      user_id: school.user_id,
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
