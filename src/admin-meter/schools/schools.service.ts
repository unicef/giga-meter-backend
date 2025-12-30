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
  RequestSchoolsAdminDto,
  toggleIsActiveDeviceDto,
  toggleIsActiveSchoolDto,
} from './school.dto';
import { serializeBigInt } from 'src/utility/utility';

@Injectable()
export class SchoolsService {
  private logger = new Logger(SchoolsService.name);

  constructor(private prisma: PrismaService) {}
  async getSchoolsAndDeviceCount(bodyRequest: RequestSchoolsAdminDto) {
    try {
      const { giga_id_school, countries, search } = bodyRequest;
      let { page, limit } = bodyRequest;
      const where = [Prisma.sql`school.deleted is null`];
      let lastQuery = Prisma.sql``;
      let schooldDailyPromise: Promise<any[]> = null;
      let skip = 0;
      let total = 1;

      if (giga_id_school && giga_id_school.trim()) {
        where.push(Prisma.sql`school.giga_id_school = ${giga_id_school}`);
        schooldDailyPromise = this.prisma.dailycheckapp_school.findMany({
          where: {
            giga_id_school: giga_id_school,
          },
        });
      } else {
        if (countries && countries.length > 0)
          where.push(
            Prisma.sql`school.country_code in (${Prisma.join(countries, ',')})`,
          );
        if (search && search.trim())
          where.push(Prisma.sql`school.name ILIKE ${'%' + search + '%'}`);

        if (
          typeof page !== 'number' ||
          typeof limit !== 'number' ||
          limit > 100
        )
          throw new BadRequestException('page and limit are invalid.');
        skip = page > 1 ? (page - 1) * limit : 0;
        lastQuery = Prisma.sql`OFFSET ${skip} ROWS FETCH NEXT ${limit} ROWS ONLY`;
      }
      const data = await this.prisma.$queryRaw<
        any[]
      >`SELECT school.*,(select count(dailycheckapp_school.id)  FROM dailycheckapp_school where dailycheckapp_school.giga_id_school = school.giga_id_school) as device_count from school where ${Prisma.join(where, ' AND ')} ${lastQuery}`;

      if (data.length > 0 && schooldDailyPromise) {
        total = page = limit = 1;
        data[0].school_devices = await schooldDailyPromise;
      } else
        total = (
          await this.prisma.$queryRaw<
            any[]
          >`SELECT count(school.id)::int as total from school where ${Prisma.join(where, ' AND ')}`
        )[0].total;

      return {
        success: true,
        data: serializeBigInt(data),
        timestamp: new Date().toISOString(),
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException(
        'An error occurred while retrieving schools and device count',
      );
    }
  }
  async toggleIsActiveDevice(reqDto: toggleIsActiveDeviceDto) {
    // Find the record where hardware_id + giga_id_school + is_active is true (or null/undefined)
    const { device_hardware_id, giga_id_school, is_active } = reqDto;
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
    const { giga_id_school, is_active } = reqDto;

    if (!giga_id_school || giga_id_school.trim().length === 0) {
      throw new BadRequestException('giga_id_school is null/empty');
    }
    if (typeof is_active !== 'boolean') {
      throw new BadRequestException('is_active is null/empty');
    }
    const school = await this.prisma.school.findFirst({
      where: {
        giga_id_school: giga_id_school?.trim(),
      },
    });
    if (!school) throw new NotFoundException('school not found');

    const result = await this.prisma.school.update({
      where: {
        id: school.id,
      },
      data: {
        is_active: is_active,
      },
      select: {
        giga_id_school: true,
        name: true,
        is_active: true,
      },
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
}
