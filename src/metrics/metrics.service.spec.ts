import { Test, TestingModule } from '@nestjs/testing';
import { MetricsService } from './metrics.service';
import { PrismaService } from '../prisma/prisma.service';
import { mockMetricsDto } from '../common/mock-objects';

describe('MetricsService', () => {
  let service: MetricsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MetricsService, PrismaService],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Metrics', () => {
    // it('should return metrics', async () => {
    //   jest
    //     .spyOn(prisma.dailycheckapp_country, 'count')
    //     .mockResolvedValue(mockMetricsDto.countries);
    //   jest
    //     .spyOn(prisma.dailycheckapp_school, 'count')
    //     .mockResolvedValue(mockMetricsDto.schools);
    //   jest
    //     .spyOn(prisma.measurements, 'count')
    //     .mockResolvedValue(mockMetricsDto.measurements);

    //   const metrics = await service.get();
    //   expect(metrics).toEqual(mockMetricsDto);
    // });

    it('should handle database error for country', async () => {
      // Mock the raw query for countries
      const queryRawMock = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));
      prisma.$queryRaw = queryRawMock;

      // Mock the groupBy function for schools
      const schoolGroupByMock = jest
        .fn()
        .mockResolvedValue([
          { giga_id_school: 'school1', _count: { giga_id_school: 1 } },
        ]);
      prisma.dailycheckapp_school.groupBy = schoolGroupByMock;

      // Mock the count function for measurements with where clause
      const countMock = jest
        .fn()
        .mockResolvedValue(mockMetricsDto.measurements);
      prisma.measurements.count = countMock;

      await expect(service.get()).rejects.toThrow('Database error');
    });

    // it('should handle database error for school', async () => {
    //   jest
    //     .spyOn(prisma.dailycheckapp_country, 'count')
    //     .mockResolvedValue(mockMetricsDto.countries);
    //   jest
    //     .spyOn(prisma.dailycheckapp_school, 'count')
    //     .mockRejectedValue(new Error('Database error'));
    //   jest
    //     .spyOn(prisma.measurements, 'count')
    //     .mockResolvedValue(mockMetricsDto.measurements);

    //   await expect(service.get()).rejects.toThrow('Database error');
    // });

    // it('should handle database error for measurement', async () => {
    //   jest
    //     .spyOn(prisma.dailycheckapp_country, 'count')
    //     .mockResolvedValue(mockMetricsDto.countries);
    //   jest
    //     .spyOn(prisma.dailycheckapp_school, 'count')
    //     .mockResolvedValue(mockMetricsDto.schools);
    //   jest
    //     .spyOn(prisma.measurements, 'count')
    //     .mockRejectedValue(new Error('Database error'));

    //   await expect(service.get()).rejects.toThrow('Database error');
    // });
  });
});
