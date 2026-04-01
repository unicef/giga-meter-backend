import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FeatureFlagDto, SchoolMasterDto } from './school-master.dto';
import { plainToInstance } from 'class-transformer';
import { school, school_new_registration } from '@prisma/client';
import { schoolMasterSelect } from './school-master.constant';

@Injectable()
export class SchoolMasterService {
  constructor(private prisma: PrismaService) {}

  async checkSchool(
    country_code: string,
    school_id: string,
  ): Promise<SchoolMasterDto[]> {
    const schools = await this.prisma.school.findMany({
      where: {
        external_id: { equals: school_id, mode: 'insensitive' },
        country_code,
        deleted: null,
      },
      select: schoolMasterSelect
    });
    if (schools.length > 0) {
      return schools.map(this.toDto);
    }

    const schoolRegistration = await this.prisma.school_new_registration.findFirst({
      where: {
        school_id: { equals: school_id, mode: 'insensitive' },
        deleted: null,
      },
    });

    return schoolRegistration
      ? [this.toRegistrationDto(schoolRegistration, country_code)]
      : [];
  }

  async flagsByGigaId(giga_id_school: string): Promise<FeatureFlagDto> {
    const query = {
      where: {
        giga_id_school,
      },
      select: schoolMasterSelect
    };

    const school = await this.prisma.school.findFirstOrThrow(query);
    let flags = plainToInstance(FeatureFlagDto, school?.feature_flags);

    // If flags is null/undefined, initialize with default pingService: true
    if (!flags) {
      flags = new FeatureFlagDto();
      flags.pingService = true;
    } else {
      // Ensure pingService defaults to true unless explicitly set to false
      if (flags.pingService !== false) {
        flags.pingService = true;
      }
    }

    return flags;
  }

  async setFlagsByGigaId(
    giga_id_school: string,
    flagDto: FeatureFlagDto,
  ): Promise<boolean> {
    const school = await this.prisma.school.findFirstOrThrow({
      where: { giga_id_school },
      select: schoolMasterSelect
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
      is_verified: school.not_verified !== true,
    };
  }

  private toRegistrationDto(
    registration: school_new_registration,
    country_code: string,
  ): SchoolMasterDto {
    const addressObject =
      registration.address && typeof registration.address === 'object'
        ? (JSON.parse(JSON.stringify(registration.address)) as Record<string, any>)
        : {};

    return {
      id: parseInt(registration.id.toString()),
      school_id: registration.school_id,
      code: '',
      name: registration.school_name,
      country_id: null,
      country: country_code,
      location_id: null,
      address:
        typeof addressObject.address === 'string' ? addressObject.address : null,
      email: registration.contact_email,
      postal_code:
        typeof addressObject.postalCode === 'string'
          ? addressObject.postalCode
          : null,
      education_level: registration.education_level,
      environment: null,
      admin_1_name:
        typeof addressObject.state === 'string' ? addressObject.state : null,
      admin_2_name:
        typeof addressObject.city === 'string' ? addressObject.city : null,
      admin_3_name: null,
      admin_4_name: null,
      giga_id_school: registration.giga_id_school,
      is_verified: false,
    };
  }

  private updateFlags(school: school, flags: FeatureFlagDto): any {
    return { ...school, feature_flags: flags };
  }
}
