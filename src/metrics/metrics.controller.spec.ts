import { Test, TestingModule } from '@nestjs/testing';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { PrismaService } from '../prisma/prisma.service';
import { HttpModule } from '@nestjs/axios';
import { AuthGuard } from '../auth/auth.guard';
import { mockMetricsDto } from '../common/mock-objects';

describe('MetricsController', () => {
  let controller: MetricsController;
  let service: MetricsService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [MetricsService, PrismaService, AuthGuard],
      imports: [HttpModule],
    }).compile();

    controller = app.get<MetricsController>(MetricsController);
    service = app.get<MetricsService>(MetricsService);
  });

  it('controller should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('service should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('GetMetrics', () => {
    it('should get metrics', async () => {
      jest.spyOn(service, 'get').mockResolvedValue(mockMetricsDto);

      const response = await controller.getMetrics();
      expect(response.data).toStrictEqual(mockMetricsDto);
    });

    it('should handle null', async () => {
      jest.spyOn(service, 'get').mockResolvedValue(null);

      const response = await controller.getMetrics();
      expect(response.data).toStrictEqual(null);
    });

    it('should handle database error', async () => {
      jest.spyOn(service, 'get').mockRejectedValue(new Error('Database error'));

      await expect(controller.getMetrics()).rejects.toThrow('Database error');
    });
  });
});
