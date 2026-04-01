import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  FeatureFlagSchoolDto,
  RequestSchoolsAdminDto,
  toggleIsActiveDeviceDto,
  toggleIsActiveSchoolDto,
} from './school.dto';
import { serializeBigInt } from 'src/utility/utility';
import { plainToInstance } from 'class-transformer';
import { isHardwareIdBlocked } from 'src/common/hardware-id.utils';

@Injectable()
export class SchoolsService {
  private logger = new Logger(SchoolsService.name);

  constructor(private prisma: PrismaService) {}
  async getSchoolsAndDeviceCount(bodyRequest: RequestSchoolsAdminDto) {
    try {
      const { giga_id_school, countries, search, status } = bodyRequest;
      // Normalize page and limit to safe integers
      const page = Math.floor(bodyRequest.page || 1);
      const limit = Math.floor(bodyRequest.limit || 10);
      const where = [Prisma.sql`school.deleted is null`];
      let lastQuery = Prisma.sql``;
      let schooldDailyPromise: Promise<any[]> = null;
      let skip = 0;
      let total = 0;

      if (giga_id_school && giga_id_school.trim()) {
        const trimmedGigaId = giga_id_school.trim();
        where.push(Prisma.sql`school.giga_id_school = ${trimmedGigaId}`);
        schooldDailyPromise = this.prisma.dailycheckapp_school.findMany({
          select: {
            id: true,
            country_code: true,
            created_at: true,
            mac_address: true,
            device_hardware_id: true,
            is_active: true,
            giga_id_school: true,
            app_version: true,
            os: true,
          },
          distinct: ['device_hardware_id'],
          orderBy: {
            id: 'desc',
          },
          where: {
            giga_id_school: trimmedGigaId,
          },
        });
      } else {
        if (countries && countries.length > 0) {
          where.push(
            Prisma.sql`school.country_code in (${Prisma.join(countries, ',')})`,
          );
        }
        if (search && search.trim()) {
          const searchTerm = `%${search.trim()}%`;
          where.push(
            Prisma.sql`(school.name ILIKE ${searchTerm} 
            OR school.giga_id_school ILIKE ${searchTerm} 
            OR school.country_code ILIKE ${searchTerm})`,
          );
        }
        if (status !== null && status !== undefined) {
          where.push(Prisma.sql`school.is_active = ${status}`);
        }

        if (page <= 0 || limit <= 0 || limit > 100)
          throw new BadRequestException('page and limit are invalid.');
        skip = (page - 1) * limit;
        lastQuery = Prisma.sql`LIMIT ${limit} OFFSET ${skip}`;
      }
      const data = await this.prisma.$queryRaw<any[]>`
        SELECT 
          school.id,
          school.name,
          school.giga_id_school,
          school.feature_flags,
          school.country_code,
          school.is_active,
          school.education_level,
          (
            SELECT COUNT(DISTINCT ds.device_hardware_id)::int 
            FROM dailycheckapp_school ds 
            WHERE ds.giga_id_school = school.giga_id_school
          ) as device_count 
        FROM school 
        WHERE ${Prisma.join(where, ' AND ')} 
        ORDER BY school.name ASC NULLS LAST, school.id ASC
        ${lastQuery}
      `;

      if (data.length > 0 && schooldDailyPromise) {
        total = 1;
        data[0].school_devices = (await schooldDailyPromise).map((item) => ({
          ...item,
          is_active: item.is_active ?? true,
        }));
      } else {
        const countData = await this.prisma.$queryRaw<any[]>`
          SELECT count(school.id)::int as total 
          FROM school 
          WHERE ${Prisma.join(where, ' AND ')}
        `;
        total = countData[0]?.total || 0;
      }

      const finalPage = schooldDailyPromise ? 1 : page;
      const finalLimit = schooldDailyPromise ? 1 : limit;

      return {
        success: true,
        data: serializeBigInt(data),
        timestamp: new Date().toISOString(),
        meta: {
          page: finalPage,
          limit: finalLimit,
          total,
          totalPages: Math.ceil(total / finalLimit),
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(error);
      throw new InternalServerErrorException(
        'An error occurred while retrieving schools and device count',
      );
    }
  }
  async toggleIsActiveDevice(reqDto: toggleIsActiveDeviceDto) {
    // Find the record where hardware_id + giga_id_school + is_active is true (or null/undefined)
    const { device_hardware_id, giga_id_school, is_active } = plainToInstance(
      toggleIsActiveDeviceDto,
      reqDto,
    );
    // If the hardware ID is blocked/generic, don't perform deactivation
    if (isHardwareIdBlocked(device_hardware_id)) {
      throw new BadRequestException('device_hardware_id is blocked/generic');
    }
    if (!device_hardware_id || device_hardware_id.trim().length === 0) {
      throw new BadRequestException('device_hardware_id is null/empty');
    }
    if (!giga_id_school || giga_id_school.trim().length === 0) {
      throw new BadRequestException('giga_id_school is null/empty');
    }
    if (typeof is_active !== 'boolean') {
      throw new BadRequestException('is_active is null/empty');
    }
    const result = await this.prisma.dailycheckapp_school.updateMany({
      where: {
        device_hardware_id,
        giga_id_school: giga_id_school?.trim(),
      },
      data: {
        is_active: is_active,
      },
    });

    if (result.count > 0) {
      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
        message: 'success',
      };
    } else {
      return {
        success: false,
        data: {},
        timestamp: new Date().toISOString(),
        message: 'failed',
      };
    }
  }

  async toggleIsActiveSchool(reqDto: toggleIsActiveSchoolDto) {
    // Find the record where hardware_id + giga_id_school + is_active is true (or null/undefined)
    const { is_active, giga_ids_school, giga_id_school } = reqDto;
    let gigaIds = [...(giga_id_school || []), ...(giga_ids_school || [])];
    if (!gigaIds || gigaIds.length === 0) {
      throw new BadRequestException('giga_id_school is null/empty');
    }

    if (typeof is_active !== 'boolean') {
      throw new BadRequestException('is_active is null/empty');
    }
    gigaIds = gigaIds.map((gigaId) => gigaId.trim());
    const school = await this.prisma.school.findMany({
      where: {
        giga_id_school: { in: gigaIds },
      },
    });
    if (!school.length)
      throw new NotFoundException(
        `school${gigaIds.length > 1 ? 's' : ''} not found`,
      );

    const result = await this.prisma.school.updateMany({
      where: {
        id: { in: school.map((s) => s.id) },
      },
      data: {
        is_active: is_active,
      }
    });

    if (result) {
      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
        message: 'success',
      };
    } else {
      return {
        success: false,
        data: {},
        timestamp: new Date().toISOString(),
        message: 'failed',
      };
    }
  }
  async updateFeatureBySchool(reqDto: FeatureFlagSchoolDto) {
    try {
      const { giga_id_school, feature_flags } = plainToInstance(
        FeatureFlagSchoolDto,
        reqDto,
      );

      if (!giga_id_school || giga_id_school.trim().length === 0) {
        throw new BadRequestException('giga_id_school is null/empty');
      }
      const select = {
        id: true,
        giga_id_school: true,
        feature_flags: true,
      };

      const school = await this.prisma.school.findFirst({
        select,
        where: {
          giga_id_school: giga_id_school.trim(),
        },
      });

      if (!school) {
        throw new NotFoundException('School not found');
      }

      const updatedSchool = await this.prisma.school.update({
        select,
        where: {
          id: school.id,
        },

        data: {
          feature_flags: feature_flags as any,
        },
      });

      return {
        success: true,
        data: {
          giga_id_school: updatedSchool.giga_id_school,
          feature_flags: updatedSchool.feature_flags,
        },
        timestamp: new Date().toISOString(),
        message: 'Feature flags updated successfully',
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      this.logger.error(error);
      throw new InternalServerErrorException(
        'An error occurred while updating feature flags',
      );
    }
  }
}
