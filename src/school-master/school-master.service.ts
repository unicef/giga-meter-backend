import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { school as School } from '@prisma/client';
import { FeatureFlagDto, SchoolMasterDto } from './school-master.dto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class SchoolMasterService {
  constructor(private prisma: PrismaService) {}

  async checkSchool(country_code: string, school_id: string): Promise<boolean> {
    const schools = await this.prisma.school.findFirst({
      where: { external_id: school_id },
    });

    return schools ? true : false;
  }

  async flagsByGigaId(giga_id_school: string): Promise<FeatureFlagDto> {
    const query = {
      where: {
        giga_id_school,
      },
    };

    const school = await this.prisma.school.findFirstOrThrow(query);
    return plainToInstance(FeatureFlagDto, school.feature_flags);
  }

  async setFlagsByGigaId(
    giga_id_school: string,
    flagDto: FeatureFlagDto,
  ): Promise<boolean> {
    const school = await this.prisma.school.findFirstOrThrow({
      where: { giga_id_school },
    });

    if (school) {
      await this.prisma.school.updateMany({
        where: { giga_id_school },
        data: { feature_flags: JSON.stringify(flagDto) },
      });
      return true;
    }
    return false;
  }

  private toDto(school: School): SchoolMasterDto {
    return {
      id: school.id.toString(),
      name: school.name,
      created: school.created,
      modified: school.modified,
      timezone: school.timezone,
      geopoint: school.geopoint,
      gps_confidence: school.gps_confidence,
      altitude: school.altitude,
      address: school.address,
      postal_code: school.postal_code,
      email: school.email,
      education_level: school.education_level,
      environment: school.environment,
      school_type: school.school_type,
      country_id: school.country_id,
      location_id: school.location_id,
      admin_1_name: school.admin_1_name,
      admin_2_name: school.admin_2_name,
      admin_3_name: school.admin_3_name,
      admin_4_name: school.admin_4_name,
      external_id: school.external_id,
      giga_id_school: school.giga_id_school,
      last_weekly_status_id: school.last_weekly_status_id,
      name_lower: school.name_lower,
      education_level_regional: school.education_level_regional,
      feature_flags: plainToInstance(FeatureFlagDto, school.feature_flags),
      created_at: school.created_at,
    };
  }
}
