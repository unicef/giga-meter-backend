import { Test, TestingModule } from '@nestjs/testing';
import { PingAggregationController } from './ping-aggregation.controller';
import { PingAggregationService } from './ping-aggregation.service';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('PingAggregationController', () => {
  let controller: PingAggregationController;
  let service: PingAggregationService;

  const mockPingAggregationService = {
    aggregateDailyPingData: jest.fn(),
    getRawPings: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PingAggregationController],
      providers: [
        {
          provide: PingAggregationService,
          useValue: mockPingAggregationService,
        },
      ],
    }).compile();

    controller = module.get<PingAggregationController>(
      PingAggregationController,
    );
    service = module.get<PingAggregationService>(PingAggregationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('aggregateDailyPingData', () => {
    it('should initiate daily ping data aggregation and return a message', async () => {
      const result = await controller.aggregateDailyPingData();
      expect(service.aggregateDailyPingData).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('getRaw', () => {
    it('should return raw ping data', async () => {
      const query = { schoolId: 'school-1', page: 1, pageSize: 10 };
      const expectedResult = { data: [], meta: {} };
      mockPingAggregationService.getRawPings.mockResolvedValue(expectedResult);

      const result = await controller.getAggregateRecords(query as any);

      expect(service.getRawPings).toHaveBeenCalledWith(query);
      expect(result).toBe(expectedResult);
    });

    it('should throw HttpException on error', async () => {
      const query = { schoolId: 'school-1', page: 1, pageSize: 10 };
      const error = new Error('Test Error');
      mockPingAggregationService.getRawPings.mockRejectedValue(error);

      await expect(
        controller.getAggregateRecords(query as any),
      ).rejects.toThrow(new HttpException(error, HttpStatus.BAD_REQUEST));
    });
  });
});
