import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerService } from './scheduler.service';
import { PingAggregationService } from 'src/ping-aggregation/ping-aggregation.service';
import { Logger } from '@nestjs/common';

describe('SchedulerService', () => {
  let service: SchedulerService;
  let pingAggregationService: PingAggregationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulerService,
        {
          provide: PingAggregationService,
          useValue: {
            aggregateDailyPingData: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SchedulerService>(SchedulerService);
    pingAggregationService = module.get<PingAggregationService>(
      PingAggregationService,
    );
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('aggregateDailyPingData', () => {
    it('should call aggregateDailyPingData on PingAggregationService', async () => {
      await service.aggregateDailyPingData();
      expect(
        pingAggregationService.aggregateDailyPingData,
      ).toHaveBeenCalledTimes(1);
    });

    it('should log the start of the aggregation', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'log');
      await service.aggregateDailyPingData();
      expect(loggerSpy).toHaveBeenCalledWith(
        `Starting Scheduler daily aggregation`,
      );
    });

    it('should log an error if aggregation fails', async () => {
      const error = new Error('Test Error');
      (
        pingAggregationService.aggregateDailyPingData as jest.Mock
      ).mockRejectedValue(error);
      const loggerSpy = jest.spyOn(Logger.prototype, 'error');
      await service.aggregateDailyPingData();
      expect(loggerSpy).toHaveBeenCalledWith(
        `Error during daily ping data aggregation: ${error.message}`,
        error.stack,
      );
    });
  });
});
