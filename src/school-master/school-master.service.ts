import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FeatureFlagDto } from './school-master.dto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class SchoolMasterService {
  constructor(private prisma: PrismaService) {}

  async checkSchool(country_code: string, school_id: string): Promise<boolean> {
    const count = await this.prisma.school.count({
      where: { external_id: school_id, country_code },
    });

    return count ? true : false;
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
      await this.prisma.school.updateMany({
        where: { giga_id_school },
        data: { feature_flags: JSON.stringify(flagDto) },
      });
      return true;
    }
    return false;
  }
}
