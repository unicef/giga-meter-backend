import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PingAggregationService } from 'src/ping-aggregation/ping-aggregation.service';
import { PrismaService } from 'src/prisma/prisma.service';
import redisClient from 'src/utils/redis.client';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly pingAggregationService: PingAggregationService,
    private readonly prisma: PrismaService,
  ) {}

  @Cron('0 0 */4 * * *')
  async resolvePendingSchoolRegistrations() {
    try {
      const lockKey = 'scheduler-pending-registration-lock';
      const acquired = await redisClient.set(
        lockKey,
        'locked',
        'PX',
        60000,
        'NX',
      );
      if (acquired !== 'OK') {
        this.logger.log(
          'Another pod is already running the pending registration task. Skipping.',
        );
        return;
      }
      this.logger.log(`Starting pending school registrations check`);

      const pendingRegistrations =
        await this.prisma.school_new_registration.findMany({
          where: {
            verification_status: 'PENDING',
            deleted: null,
          },
          select: { giga_id_school: true },
        });

      if (pendingRegistrations.length === 0) {
        this.logger.log('No pending registrations found');
        return;
      }

      const gigaSchoolIds = pendingRegistrations
        .map((reg) => reg.giga_id_school)
        .filter((id) => id);

      if (gigaSchoolIds.length === 0) {
        this.logger.log(
          'No valid giga_id_school found in pending registrations',
        );
        return;
      }

      const BATCH_SIZE = 1000;
      let totalResolvedCount = 0;

      for (let i = 0; i < gigaSchoolIds.length; i += BATCH_SIZE) {
        const batchIds = gigaSchoolIds.slice(i, i + BATCH_SIZE);

        const matchingSchools = await this.prisma.school.findMany({
          where: {
            giga_id_school: { in: batchIds },
            deleted: null,
          },
          select: { giga_id_school: true },
        });

        const matchedGigaIds = matchingSchools.map((s) => s.giga_id_school);

        if (matchedGigaIds.length > 0) {
          const updateResult =
            await this.prisma.school_new_registration.updateMany({
              where: {
                verification_status: 'PENDING',
                giga_id_school: { in: matchedGigaIds },
                deleted: null,
              },
              data: {
                verification_status: 'RESOLVED',
                deleted: new Date(),
              },
            });
          totalResolvedCount += updateResult.count;
        }
      }

      this.logger.log(
        `Finished pending school registrations check. Resolved ${totalResolvedCount} out of ${pendingRegistrations.length} pending registrations.`,
      );
    } catch (error) {
      this.logger.error(
        `Error during pending school registrations check: ${error.message}`,
        error.stack,
      );
    }
  }

  @Cron('0 0 9,15,21,23 * * *')
  async aggregateDailyPingData() {
    try {
      const now = new Date();
      const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        now.getHours(),
        now.getMinutes(),
        now.getSeconds(),
        0,
      );
      const millisecondsElapsed = now.getTime() - startOfDay.getTime();
      await new Promise((resolve) =>
        setTimeout(resolve, millisecondsElapsed * 1000),
      );
      const lockKey = 'scheduler-lock';
      const acquired = await redisClient.set(
        lockKey,
        'locked',
        'PX',
        60000,
        'NX',
      );
      if (acquired !== 'OK') {
        this.logger.log('Another pod is already running this task. Skipping.');
        return;
      }
      this.logger.log(`Starting Scheduler daily aggregation`);
      await this.pingAggregationService.aggregateDailyPingData();
    } catch (error) {
      this.logger.error(
        `Error during daily ping data aggregation: ${error.message}`,
        error.stack,
      );
    }
  }
}
