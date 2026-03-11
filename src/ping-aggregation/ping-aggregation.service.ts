import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  GetRawPingConnectivityDto,
  GetRawPingsQueryDto,
} from './ping-aggregation.dto';
import { plainToInstance } from 'class-transformer';
import redisClient from 'src/utils/redis.client';

@Injectable()
export class PingAggregationService {
  private readonly logger = new Logger(PingAggregationService.name);
  constructor(private prisma: PrismaService) {}
  async getRawPings(query: GetRawPingsQueryDto) {
    try {
      const { schoolId, from, to, page, pageSize } = query;
      const aggregationSchedulerLastRunTime =
        (await redisClient.get('aggregation_scheduler_last_run_time')) ||
        'not_found';
      const aggregationSchedulerStatus =
        (await redisClient.get('aggregation_scheduler_status')) === 'on_going'
          ? 'on_going'
          : 'on_going'; //completed

      const where: Prisma.ConnectivityPingChecksDailyAggrWhereInput = {};
      if (schoolId) where.giga_id_school = schoolId;

      if (!isNaN(new Date(from).getTime()) && !isNaN(new Date(to).getTime()))
        where.timestamp_date = {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
        };
      else throw new Error('from and to both are required');
      const total = await this.prisma.connectivityPingChecksDailyAggr.count({
        where,
      });
      const data = await this.prisma.connectivityPingChecksDailyAggr.findMany({
        where,
        orderBy: { timestamp_date: 'desc' },
        ...(page && pageSize
          ? { skip: (page - 1) * pageSize, take: parseInt(pageSize.toString()) }
          : {}),
      });

      return {
        meta: {
          page,
          pageSize,
          total,
          aggregationSchedulerStatus,
          aggregationSchedulerLastRunTime,
        },
        data,
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async aggregateDailyPingData(targetDateObj?: Date | undefined) {
    try {
      await redisClient.set('aggregation_scheduler_status', 'on_going');
      await redisClient.set(
        'aggregation_scheduler_last_run_time',
        new Date().toISOString(),
      );
      const base = targetDateObj || new Date();
      if (!targetDateObj) {
        base.setUTCDate(base.getUTCDate()); //use base.getUTCDate()-1 for previous day
      }
      const utcYear = base.getUTCFullYear();
      const utcMonth = base.getUTCMonth();
      const utcDate = base.getUTCDate();

      const start = new Date(Date.UTC(utcYear, utcMonth, utcDate, 8, 0, 0, 0));
      const insertStart = new Date(
        Date.UTC(utcYear, utcMonth, utcDate, 0, 0, 0, 0),
      );
      const end = new Date(
        Date.UTC(utcYear, utcMonth, utcDate, 19, 59, 59, 999),
      );

      this.logger.log(
        `Starting aggregation for ${start.toISOString()} and end ${end.toISOString()}`,
      );

      let offset = 0;
      const limit = 500;
      let totalDevicesProcessed = 0;
      let data: any[] = [];

      do {
        data = await this.prisma.$queryRaw<
          any[]
        >`SELECT giga_id_school, browser_id as device_id, 
      SUM( CASE WHEN is_connected = TRUE THEN 1 ELSE 0 END ) AS isConnectedTrueSum,
       count(DISTINCT app_local_uuid) as isConnectedAllSum, AVG(latency) AS latencyAvg 
       FROM connectivity_ping_checks ${Prisma.sql`where timestamp BETWEEN ${start} AND ${end}`} 
       GROUP BY giga_id_school, browser_id order by giga_id_school asc LIMIT ${limit} OFFSET ${offset}`;

        if (data.length === 0) break;

        // To ensure idempotency, we check for and delete any existing aggregated data
        // for the target date and the specific school/device combinations before inserting
        // the new aggregations. This prevents duplicate records if the job is run multiple times.
        const existingData =
          await this.prisma.connectivityPingChecksDailyAggr.findMany({
            where: {
              timestamp_date: insertStart,
              giga_id_school: {
                in: [...new Set(data.map((item) => item.giga_id_school))],
              },
              browser_id: {
                in: [...new Set(data.map((item) => item.device_id))],
              },
            },
            select: {
              id: true,
            },
          });
        if (existingData.length > 0) {
          await this.prisma.connectivityPingChecksDailyAggr.deleteMany({
            where: {
              id: {
                in: existingData.map((item) => item.id),
              },
            },
          });
        }
        const insertData: any[] = [];
        for (const record of data) {
          const is_connected_true = Number(record.isconnectedtruesum) || 0;
          const is_connected_all = Number(record.isconnectedallsum) || 1;
          const uptime = (is_connected_true / is_connected_all) * 100 || 0.0;
          insertData.push({
            timestamp_date: insertStart,
            giga_id_school: record.giga_id_school,
            browser_id: record.device_id || null,
            is_connected_true,
            is_connected_all,
            uptime,
            unloaded_latency_avg: record.latencyavg || 0.0,
          });
        }
        if (insertData.length > 0) {
          await this.prisma.connectivityPingChecksDailyAggr.createMany({
            data: insertData,
            skipDuplicates: true,
          });
        }

        totalDevicesProcessed += data.length;
        offset += limit;
      } while (data.length === limit);

      this.logger.log(
        `Aggregation complete for ${totalDevicesProcessed} devices.`,
      );

      return totalDevicesProcessed;
    } catch (error) {
      this.logger.error(error);
      throw error;
    } finally {
      await redisClient.set('aggregation_scheduler_status', 'completed');
    }
  }

  async getRawPingConnectivity(query: GetRawPingConnectivityDto) {
    try {
      if (!query?.size) {
        query.size = 100;
      }
      const { schoolId, from, to, size, page } = plainToInstance(
        GetRawPingConnectivityDto,
        query,
      );

      const where: Prisma.connectivity_ping_checksWhereInput = {};
      if (schoolId) where.giga_id_school = schoolId;

      if (!isNaN(new Date(from).getTime()) && !isNaN(new Date(to).getTime())) {
        const fromDate = new Date(from);
        const toDate = new Date(to);
        fromDate.setUTCHours(0, 0, 0, 0);
        toDate.setUTCHours(23, 59, 59, 999);
        where.timestamp = {
          ...(from && { gte: fromDate }),
          ...(to && { lte: toDate }),
        };
      } else throw new BadRequestException('from and to both are required');

      const total = await this.prisma.connectivity_ping_checks.count({
        where,
      });
      const data = await this.prisma.connectivity_ping_checks.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: size,
        skip: (page - 1) * size,
      });

      return { meta: { page, pageSize: size, total }, data };
    } catch (error) {
      this.logger.log(error);
      if (error instanceof BadRequestException) throw error;

      throw new HttpException('Internal server error', error.status);
    }
  }
}
