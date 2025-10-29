import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PingAggregationService } from 'src/ping-aggregation/ping-aggregation.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly pingAggregationService: PingAggregationService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async aggregateDailyPingData() {
    try {
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
