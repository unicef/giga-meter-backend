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
  }): Promise<FlaggedSchoolDto[]> {
    const { skip, take } = params;
    const schools = this.prisma.dailycheckapp_flagged_school.findMany({
      skip,
      take,
    });
    return (await schools).map(this.toDto);
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
}
