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

/**
 * The app builds the upload URL from the school id it holds at upload time.
 * Some start-up paths clear that id but keep the queue of pings not yet
 * uploaded, so the queue arrives with the id as the text "undefined".
 */
const isMissingSchoolId = (giga_id_school?: string | null) =>
  ['', 'undefined', 'null'].includes(
    (giga_id_school ?? '').trim().toLowerCase(),
  );

/** How long the app keeps a queued ping before deleting it (cleanupOldRecords). */
const APP_PING_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * The app only runs that cleanup after every batch uploads, and it uploads the
 * oldest batch first and stops at the first failure. A batch we reject is
 * therefore never cleaned up, and it blocks every newer ping on the device.
 */
const isPastAppRetention = (records: CreateConnectivityDto[] = []) => {
  const cutoff = Date.now() - APP_PING_RETENTION_MS;
  return (
    records.length > 0 &&
    records.every(
      (record) =>
        !!record.timestamp && new Date(record.timestamp).getTime() < cutoff,
    )
  );
};

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
    const schoolId = isMissingSchoolId(giga_id_school)
      ? await this.schoolOfDevice(createConnectivityDto)
      : giga_id_school;
    // Only reachable without a school id: a given id is used as it is.
    if (!schoolId && isPastAppRetention(createConnectivityDto)) {
      const browserIds = new Set(createConnectivityDto.map((r) => r.browserId));
      this.logger.warn(
        `Dropped ${createConnectivityDto.length} connectivity checks sent without a school id: ` +
          `browserId ${[...browserIds].join(', ')} is not registered to one school, ` +
          `and all are older than the app keeps them`,
      );
      return createConnectivityDto;
    }
    if (!schoolId || (await existSchool(this.prisma, schoolId)) === false)
      throw new BadRequestException('School does not exist');
    if (schoolId !== giga_id_school)
      this.logger.warn(
        `${createConnectivityDto.length} connectivity checks sent without a school id; ` +
          `storing them under ${schoolId}, the school their browserId is registered to`,
      );
    try {
      await this.prisma.connectivity_ping_checks.createMany({
        data: createConnectivityDto.map((record) => ({
          ...record,
          giga_id_school: schoolId,
        })),
        // A batch the client already delivered would otherwise fail as a whole
        // on app_local_uuid and stay queued on the device forever.
        skipDuplicates: true,
      });
      return createConnectivityDto;
    } catch (error) {
      this.logger.error(
        `Failed to store connectivity checks for ${schoolId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * The school the batch's device is registered to. Each ping carries the
   * device's registration id as browserId (the app's schoolUserId, stored as
   * dailycheckapp_school.user_id). A logged-out registration still counts: the
   * pings were taken before the logout. Null unless the whole batch comes from
   * one device registered to exactly one school.
   */
  private async schoolOfDevice(
    records: CreateConnectivityDto[] = [],
  ): Promise<string | null> {
    const browserIds = new Set(
      records.map((record) => record.browserId?.trim()),
    );
    const [browserId] = browserIds;
    if (browserIds.size !== 1 || !browserId) return null;

    const registrations = await this.prisma.dailycheckapp_school.findMany({
      where: { user_id: browserId },
      select: { giga_id_school: true },
    });
    const schools = new Set(
      registrations.map((r) => r.giga_id_school).filter(Boolean),
    );
    return schools.size === 1 ? [...schools][0] : null;
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
