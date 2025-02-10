import { BadRequestException, Injectable } from '@nestjs/common';
import {
  CreateConnectivityDto,
  GetConnectivityRecordsWithSchoolDto,
} from './connectivity.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { existSchool } from 'src/utility/utility';

@Injectable()
export class ConnectivityService {
  constructor(private prisma: PrismaService) {}

  async createMany(
    createConnectivityDto: CreateConnectivityDto[],
    giga_id_school: string,
  ) {
    if ((await existSchool(this.prisma, giga_id_school)) === false)
      throw new BadRequestException('School does not exist');

    await this.prisma.connectivity_ping_checks.createMany({
      data: createConnectivityDto.map((record) => ({
        ...record,
        giga_id_school,
      })),
    });
    return createConnectivityDto;
  }
  async findAll(query: GetConnectivityRecordsWithSchoolDto) {
    const {
      giga_id_school,
      page = 1,
      per_page = 10,
      start_time = new Date(0), // 1970-01-01T00:00:00.000Z
      end_time = new Date(), // current date
    } = query;
    const data = await this.prisma.connectivity_ping_checks.findMany({
      where: {
        giga_id_school,
        timestamp: {
          gte: start_time,
          lte: end_time,
        },
      },
      skip: (page - 1) * per_page,
      take: per_page * 1,
    });
    return {
      giga_id_school,
      time_range: {
        start_time,
        end_time,
      },
      records: data,
    };
  }

  async findOne(id: number) {
    return await this.prisma.connectivity_ping_checks.findUnique({
      where: {
        id,
      },
    });
  }
}
