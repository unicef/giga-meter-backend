import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { dailycheckapp_flagged_school as FlaggedSchool } from '@prisma/client';
import { FlaggedSchoolDto } from './flagged-school.dto';

@Injectable()
export class FlaggedSchoolService {
  constructor(private prisma: PrismaService) {}

  async schools(params: {
    skip?: number;
    take?: number;
    write_access?: boolean;
    countries?: string[];
  }): Promise<FlaggedSchoolDto[]> {
    const { skip, take, write_access, countries } = params;
    const filter: Record<string, any> = {
      detected_country: {
        in: countries,
      },
    };
    if (write_access) {
      delete filter.country_code;
    }

    const schools = this.prisma.dailycheckapp_flagged_school.findMany({
      where: filter,
      skip,
      take,
      orderBy: { created: 'desc' },
    });
    return (await schools).map(this.toDto);
  }

  async schoolsByCountryId(
    detected_country: string,
  ): Promise<FlaggedSchoolDto[]> {
    const schools = this.prisma.dailycheckapp_flagged_school.findMany({
      where: { detected_country },
    });
    return (await schools).map(this.toDto);
  }

  async createSchool(schoolDto: FlaggedSchoolDto): Promise<string> {
    const model = this.toModel(schoolDto);
    const school = await this.prisma.dailycheckapp_flagged_school.create({
      data: model,
    });
    return school.id.toString();
  }

  private toDto(school: FlaggedSchool): FlaggedSchoolDto {
    return {
      id: school.id.toString(),
      detected_country: school.detected_country,
      selected_country: school.selected_country,
      school_id: school.school_id,
      giga_id_school: school.giga_id_school,
      created: school.created,
      created_at: school.created_at,
    };
  }

  private toModel(school: FlaggedSchoolDto): any {
    return {
      detected_country: school.detected_country.toUpperCase(),
      selected_country: school.selected_country.toUpperCase(),
      school_id: school.school_id,
      giga_id_school: school.giga_id_school,
      created: school.created,
    };
  }
}
