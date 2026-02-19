import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PingAggregationService } from 'src/ping-aggregation/ping-aggregation.service';
import redisClient from 'src/utils/redis.client';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly pingAggregationService: PingAggregationService,
  ) {}

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
