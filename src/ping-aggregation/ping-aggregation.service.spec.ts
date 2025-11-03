import { Test, TestingModule } from '@nestjs/testing';
import { PingAggregationService } from './ping-aggregation.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('PingAggregationService', () => {
  let service: PingAggregationService;
  let prisma: PrismaService;

  const mockPrismaService = {
    connectivityPingChecksDailyAggr: {
      count: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PingAggregationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PingAggregationService>(PingAggregationService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getRawPings', () => {
    it('should throw an error if from and to are not provided', async () => {
      const query = { schoolId: 'school-1', page: 1, pageSize: 10 };
      await expect(service.getRawPings(query as any)).rejects.toThrow(
        'from and to both are required',
      );
    });

    it('should return paginated raw pings', async () => {
      const query = {
        schoolId: 'school-1',
        from: '2025-01-01',
        to: '2025-01-31',
        page: 1,
        pageSize: 10,
      };
      const mockData = [{ id: '1', giga_id_school: 'school-1' }];
      const total = 1;

      mockPrismaService.connectivityPingChecksDailyAggr.count.mockResolvedValue(
        total,
      );
      mockPrismaService.connectivityPingChecksDailyAggr.findMany.mockResolvedValue(
        mockData,
      );

      const result = await service.getRawPings(query);

      expect(prisma.connectivityPingChecksDailyAggr.count).toHaveBeenCalledWith(
        {
          where: {
            giga_id_school: query.schoolId,
            timestamp_date: {
              gte: new Date(query.from),
              lte: new Date(query.to),
            },
          },
        },
      );
      expect(
        prisma.connectivityPingChecksDailyAggr.findMany,
      ).toHaveBeenCalledWith({
        where: {
          giga_id_school: query.schoolId,
          timestamp_date: {
            gte: new Date(query.from),
            lte: new Date(query.to),
          },
        },
        orderBy: { timestamp_date: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      });

      expect(result).toEqual({
        meta: { page: query.page, pageSize: query.pageSize, total },
        data: mockData,
      });
    });

    it('should return raw pings without pagination', async () => {
      const query = {
        schoolId: 'school-1',
        from: '2025-01-01',
        to: '2025-01-31',
      };
      const mockData = [
        { id: '1', giga_id_school: 'school-1' },
        { id: '2', giga_id_school: 'school-1' },
      ];
      const total = 2;

      mockPrismaService.connectivityPingChecksDailyAggr.count.mockResolvedValue(
        total,
      );
      mockPrismaService.connectivityPingChecksDailyAggr.findMany.mockResolvedValue(
        mockData,
      );

      const result = await service.getRawPings(query as any);

      expect(prisma.connectivityPingChecksDailyAggr.count).toHaveBeenCalledWith(
        {
          where: {
            giga_id_school: query.schoolId,
            timestamp_date: {
              gte: new Date(query.from),
              lte: new Date(query.to),
            },
          },
        },
      );
      expect(
        prisma.connectivityPingChecksDailyAggr.findMany,
      ).toHaveBeenCalledWith({
        where: {
          giga_id_school: query.schoolId,
          timestamp_date: {
            gte: new Date(query.from),
            lte: new Date(query.to),
          },
        },
        orderBy: { timestamp_date: 'desc' },
      });

      expect(result).toEqual({
        meta: { page: undefined, pageSize: undefined, total },
        data: mockData,
      });
    });

    it('should handle errors', async () => {
      const query = {
        schoolId: 'school-1',
        page: 1,
        pageSize: 10,
        from: '2025-01-01',
        to: '2025-01-31',
      };
      const error = new Error('Test Error');
      mockPrismaService.connectivityPingChecksDailyAggr.count.mockRejectedValue(
        error,
      );

      await expect(service.getRawPings(query)).rejects.toThrow(error);
    });
  });

  describe('aggregateDailyPingData', () => {
    it('should aggregate ping data for a specific date', async () => {
      const targetDate = new Date('2025-01-01T00:00:00.000Z');
      const queryResult = [
        {
          giga_id_school: 'school-1',
          device_id: 'device-1',
          isconnectedtruesum: 80,
          isconnectedallsum: 100,
          latencyavg: 50,
        },
      ];
      mockPrismaService.$queryRaw.mockResolvedValue(queryResult);
      mockPrismaService.connectivityPingChecksDailyAggr.findMany.mockResolvedValue(
        [],
      );
      mockPrismaService.connectivityPingChecksDailyAggr.createMany.mockResolvedValue(
        { count: 1 },
      );

      await service.aggregateDailyPingData(targetDate);

      expect(prisma.$queryRaw).toHaveBeenCalled();
      expect(
        prisma.connectivityPingChecksDailyAggr.findMany,
      ).toHaveBeenCalled();
      expect(
        prisma.connectivityPingChecksDailyAggr.createMany,
      ).toHaveBeenCalledWith({
        data: [
          {
            timestamp_date: targetDate,
            giga_id_school: 'school-1',
            browser_id: 'device-1',
            is_connected_true: 80,
            is_connected_all: 100,
            uptime: 80,
            unloaded_latency_avg: 50,
          },
        ],
        skipDuplicates: true,
      });
    });

    it('should delete existing data before inserting new data', async () => {
      const targetDate = new Date('2025-01-01T00:00:00.000Z');
      const queryResult = [
        {
          giga_id_school: 'school-1',
          device_id: 'device-1',
          isconnectedtruesum: 80,
          isconnectedallsum: 100,
          latencyavg: 50,
        },
      ];
      const existingData = [{ id: 'existing-id' }];
      mockPrismaService.$queryRaw.mockResolvedValue(queryResult);
      mockPrismaService.connectivityPingChecksDailyAggr.findMany.mockResolvedValue(
        existingData,
      );

      await service.aggregateDailyPingData(targetDate);

      expect(
        prisma.connectivityPingChecksDailyAggr.deleteMany,
      ).toHaveBeenCalledWith({
        where: {
          id: {
            in: ['existing-id'],
          },
        },
      });
    });

    it('should handle aggregation for the previous day if no date is provided', async () => {
      const queryResult = [
        {
          giga_id_school: 'school-1',
          device_id: 'device-1',
          isconnectedtruesum: 80,
          isconnectedallsum: 100,
          latencyavg: 50,
        },
      ];
      mockPrismaService.$queryRaw.mockResolvedValue(queryResult);
      mockPrismaService.connectivityPingChecksDailyAggr.findMany.mockResolvedValue(
        [],
      );

      await service.aggregateDailyPingData();

      expect(prisma.$queryRaw).toHaveBeenCalled();
      expect(
        prisma.connectivityPingChecksDailyAggr.findMany,
      ).toHaveBeenCalled();
      expect(
        prisma.connectivityPingChecksDailyAggr.createMany,
      ).toHaveBeenCalled();
    });

    it('should handle errors during aggregation', async () => {
      const error = new Error('Test Error');
      mockPrismaService.$queryRaw.mockRejectedValue(error);

      await expect(service.aggregateDailyPingData()).rejects.toThrow(error);
    });
  });
});
