import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  CreateConnectivityDto,
  GetConnectivityRecordsWithSchoolDto,
} from './connectivity.dto';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { existSchool } from 'src/utility/utility';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

const isDuplicateRecord = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === UNIQUE_CONSTRAINT_VIOLATION;

@Injectable()
export class ConnectivityService {
  private readonly logger = new Logger(ConnectivityService.name);

  constructor(private prisma: PrismaService) {}
  async create(createConnectivityDto: CreateConnectivityDto) {
    if (
      (await existSchool(this.prisma, createConnectivityDto.giga_id_school)) ===
      false
    )
      throw new BadRequestException('School does not exist');
    try {
      await this.prisma.connectivity_ping_checks.create({
        data: {
          ...createConnectivityDto,
        },
      });
      return createConnectivityDto;
    } catch (error) {
      // The client re-sends its offline queue until the server acknowledges it,
      // so a record we already stored is a success, not a failure.
      if (isDuplicateRecord(error)) return createConnectivityDto;
      this.logger.error(
        `Failed to store connectivity check for ${createConnectivityDto.giga_id_school}`,
        error,
      );
      throw error;
    }
  }

  async createMany(
    createConnectivityDto: CreateConnectivityDto[],
    giga_id_school: string,
  ) {
    if ((await existSchool(this.prisma, giga_id_school)) === false)
      throw new BadRequestException('School does not exist');
    try {
      await this.prisma.connectivity_ping_checks.createMany({
        data: createConnectivityDto.map((record) => ({
          ...record,
          giga_id_school,
        })),
        // A batch the client already delivered would otherwise fail as a whole
        // on app_local_uuid and stay queued on the device forever.
        skipDuplicates: true,
      });
      return createConnectivityDto;
    } catch (error) {
      this.logger.error(
        `Failed to store connectivity checks for ${giga_id_school}`,
        error,
      );
      throw error;
    }
  }
  async findAll(query: GetConnectivityRecordsWithSchoolDto) {
    const {
      giga_id_school,
      page = 1,
      per_page = 10,
      start_time = new Date(0), // 1970-01-01T00:00:00.000Z
      end_time = new Date(), // current date
    } = query;
    try {
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
    } catch (error) {
      this.logger.error(
        `Failed to read connectivity checks for ${giga_id_school}`,
        error,
      );
      throw error;
    }
  }

  async findOne(id: number) {
    return await this.prisma.connectivity_ping_checks.findUnique({
      where: {
        id,
      },
    });
  }
}
