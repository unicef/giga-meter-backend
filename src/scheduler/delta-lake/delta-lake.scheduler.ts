import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as path from 'path';
import { Worker } from 'worker_threads';
import { Logger } from '@nestjs/common';

@Injectable()
export class DeltaLakeScheduler {
  private readonly logger = new Logger(DeltaLakeScheduler.name);

  // This Cron job will run executing of application.
  @Cron(CronExpression.EVERY_10_HOURS)
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

      // Listen for messages/results from the worker thread
      worker.on('message', (result) => {
        this.logger.log(
          'Worker task complete. Result: ' + JSON.stringify(result),
        );
      });

      // Listen for errors from the worker thread
      worker.on('error', (err) => {
        this.logger.error('Worker error:', err);
      });

      // Listen for the worker thread to exit
      worker.on('exit', (code) => {
        if (code !== 0) {
          this.logger.error(`Worker stopped with exit code ${code}`);
        }
      });
    } catch (error) {
      this.logger.error('Error in offloadHeavyWork: ', error);
    }
  }
}
