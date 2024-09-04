import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FeatureFlagDto, SchoolMasterDto } from './school-master.dto';
import { plainToInstance } from 'class-transformer';
import { school } from '@prisma/client';

@Injectable()
export class SchoolMasterService {
  constructor(private prisma: PrismaService) {}

  async checkSchool(
    country_code: string,
    school_id: string,
  ): Promise<SchoolMasterDto[]> {
    const schools = this.prisma.school.findMany({
      where: { external_id: school_id, country_code },
    });

    return (await schools).map(this.toDto);
  }

  async flagsByGigaId(giga_id_school: string): Promise<FeatureFlagDto> {
    const query = {
      where: {
        giga_id_school,
      },
    };

    const school = await this.prisma.school.findFirstOrThrow(query);
    return plainToInstance(FeatureFlagDto, school?.feature_flags);
  }

  async setFlagsByGigaId(
    giga_id_school: string,
    flagDto: FeatureFlagDto,
  ): Promise<boolean> {
    await this.prisma.$executeRaw`INSERT INTO public.school(
	id, created, modified, name, timezone, geopoint, gps_confidence, altitude, address, postal_code, email, education_level, environment, school_type, country_id, location_id, admin_2_name, admin_3_name, admin_4_name, external_id, admin_1_name, last_weekly_status_id, name_lower, giga_id_school, education_level_regional, feature_flags, country_code)
	VALUES (1, null, null, 'Test school 1', null, null, null, null, 'India', '400001', null, null, null, null, 45, null, null, null, null,
		    19102023, null, null, null, '5ff8f4cc-9f74-3f48-8cb1-e68e063a7c03', null, null, 'IN');`;
    await this.prisma.$executeRaw`INSERT INTO public.school(
	id, created, modified, name, timezone, geopoint, gps_confidence, altitude, address, postal_code, email, education_level, environment, school_type, country_id, location_id, admin_2_name, admin_3_name, admin_4_name, external_id, admin_1_name, last_weekly_status_id, name_lower, giga_id_school, education_level_regional, feature_flags, country_code)
	VALUES (2, null, null, 'Test school 2', null, null, null, null, 'India', '400001', null, null, null, null, 45, null, null, null, null,
		    19102024, null, null, null, '5ff8f4cc-9f74-3f48-8cb1-e68e063a7c04', null, null, 'IN');`;

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

  private toDto(school: school): SchoolMasterDto {
    return {
      id: parseInt(school.id.toString()),
      school_id: school.external_id,
      code: '',
      name: school.name,
      country_id: school.country_id,
      country: school.country_code,
      location_id: school.location_id,
      address: school.address,
      email: school.email,
      postal_code: school.postal_code,
      education_level: school.education_level,
      environment: school.environment,
      admin_1_name: school.admin_1_name,
      admin_2_name: school.admin_2_name,
      admin_3_name: school.admin_3_name,
      admin_4_name: school.admin_4_name,
      giga_id_school: school.giga_id_school,
    };
  }
}
