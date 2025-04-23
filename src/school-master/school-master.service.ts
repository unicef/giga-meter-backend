import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  FeatureFlagDto,
  SchoolFlagsDto,
  SchoolMasterDto,
} from './school-master.dto';
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
      where: {
         
        external_id: { equals: school_id, mode: 'insensitive' },
        country_code,
      },
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
    const school = await this.prisma.school.findFirstOrThrow({
      where: { giga_id_school },
    });
    if (school) {
      const updatedSchool = this.updateFlags(school, flagDto);
      await this.prisma.school.update({
        where: { id: school.id },
        data: updatedSchool,
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
  private updateFlags(school: school, flags: FeatureFlagDto): any {
    return { ...school, feature_flags: flags };
  }

  async updateSetFlagOnSchools(
    giga_ids: string[],
    flagDto: FeatureFlagDto,
  ): Promise<SchoolFlagsDto[] | false> {
    const schools = await this.prisma.school.findMany({
      where: {
        giga_id_school: { in: giga_ids },
      },
      select: {
        id: true,
        giga_id_school: true,
        feature_flags: true,
      },
    });
    if (!schools || schools.length === 0) {
      return false; // No schools found
    }
    if (schools.length > 0) {
      const updatedSchools = schools.map((school) => ({
        ...school,
        feature_flags: {
          ...((school?.feature_flags as object) ?? {}),
          ...flagDto,
        },
      }));

      await this.prisma.$transaction(
        updatedSchools.map((school) =>
          this.prisma.school.update({
            where: { id: school.id },
            data: { feature_flags: school.feature_flags },
          }),
        ),
      );
      updatedSchools.forEach((school) => {
        delete school.id;
      });
      return updatedSchools;
    }
  }
}
