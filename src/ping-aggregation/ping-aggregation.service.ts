import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { GetRawPingsQueryDto } from './ping-aggregation.dto';

@Injectable()
export class PingAggregationService {
  private readonly logger = new Logger(PingAggregationService.name);
  constructor(private prisma: PrismaService) {}
  async getRawPings(query: GetRawPingsQueryDto) {
    try {
      const { schoolId, from, to, page, pageSize } = query;

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

      return { meta: { page, pageSize, total }, data };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async aggregateDailyPingData(targetDateObj?: Date | undefined) {
    try {
      const base = targetDateObj || new Date();
      if (!targetDateObj) {
        base.setUTCDate(base.getUTCDate() - 1);
      }
      const utcYear = base.getUTCFullYear();
      const utcMonth = base.getUTCMonth();
      const utcDate = base.getUTCDate();

      const start = new Date(Date.UTC(utcYear, utcMonth, utcDate, 0, 0, 0, 0));
      const end = new Date(
        Date.UTC(utcYear, utcMonth, utcDate, 23, 59, 59, 999),
      );

      this.logger.log(
        `Starting aggregation for ${start.toISOString()} and end ${end.toISOString()}`,
      );

      const data = await this.prisma.$queryRaw<
        any[]
      >`SELECT giga_id_school, device_id, 
      SUM( CASE WHEN is_connected = TRUE THEN 1 ELSE 0 END ) AS isConnectedTrueSum,
       SUM(1) as isConnectedAllSum, AVG(latency) AS latencyAvg 
       FROM connectivity_ping_checks ${Prisma.sql`where timestamp BETWEEN ${start} AND ${end}`} GROUP BY giga_id_school, device_id order by giga_id_school asc`;

      // To ensure idempotency, we check for and delete any existing aggregated data
      // for the target date and the specific school/device combinations before inserting
      // the new aggregations. This prevents duplicate records if the job is run multiple times.
      const existingData =
        await this.prisma.connectivityPingChecksDailyAggr.findMany({
          where: {
            timestamp_date: start,
            giga_id_school: {
              in: data.map((item) => item.giga_id_school),
            },
            browser_id: {
              in: data.map((item) => item.device_id),
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
          timestamp_date: start,
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

      this.logger.log(`Aggregation complete for ${data.length} devices.`);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
