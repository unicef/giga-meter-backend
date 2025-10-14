import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as path from 'path';
import { Worker } from 'worker_threads';
import { Logger } from '@nestjs/common';

@Injectable()
export class DeltaLakeScheduler {
  private readonly logger = new Logger(DeltaLakeScheduler.name);

  // This Cron job will run executing of application.
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  handleCron() {
    this.logger.log(
      'Scheduled job triggered. Offloading work to worker thread.',
    );
    this.offloadHeavyWork();
  }
  offloadHeavyWork() {
    try {
      const workerPath = path.resolve(
        __dirname,
        '../../workers/daltaLake.worker.js',
      );
      const worker = new Worker(workerPath, {
        workerData: { jobName: 'Scheduled Heavy Calculation' },
      });
      const terminateTimeout = setTimeout(
        () => {
          worker.terminate();
        },
        1000 * 60 * 60, // 1hour wait
      );
      worker.on('message', (result) => {
        clearTimeout(terminateTimeout);
        this.logger.log(
          'Worker task complete. Result: ' + JSON.stringify(result),
        );
      });

      worker.on('error', (err) => {
        clearTimeout(terminateTimeout);
        this.logger.error('Worker error:', err);
      });

      worker.on('exit', (code) => {
        clearTimeout(terminateTimeout);
        if (code !== 0) {
          this.logger.error(`Worker stopped with exit code ${code}`);
        }
      });
    } catch (error) {
      this.logger.error('Error in offloadHeavyWork: ', error);
    }
  }
}
