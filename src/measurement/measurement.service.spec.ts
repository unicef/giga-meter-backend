import { Test, TestingModule } from '@nestjs/testing';
import { MeasurementService } from './measurement.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  mockMeasurementDto,
  mockMeasurementFailedModel,
  mockMeasurementModel,
  mockMeasurementV2Dto,
} from '../common/mock-objects';

describe('MeasurementService', () => {
  let service: MeasurementService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MeasurementService, PrismaService],
    }).compile();

    service = module.get<MeasurementService>(MeasurementService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Measurements', () => {
    it('should return measurements', async () => {
      jest
        .spyOn(prisma.measurements, 'findMany')
        .mockResolvedValue(mockMeasurementModel);

      expect(await service.measurements(0, 5, 'timestamp')).toMatchObject(
        mockMeasurementDto,
      );
    });

    it('should handle empty result set', async () => {
      jest.spyOn(prisma.measurements, 'findMany').mockResolvedValue([]);

      expect(await service.measurements(0, 5, 'timestamp')).toEqual([]);
    });

    it('should handle database error', async () => {
      jest
        .spyOn(prisma.measurements, 'findMany')
        .mockRejectedValue(new Error('Database error'));

      await expect(service.measurements(0, 5, 'timestamp')).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('MeasurementsV2', () => {
    it('should return measurements', async () => {
      jest
        .spyOn(prisma.measurements, 'findMany')
        .mockResolvedValue(mockMeasurementModel);

      expect(await service.measurementsV2(0, 5, 'timestamp')).toMatchObject(
        mockMeasurementV2Dto,
      );
    });

    it('should handle empty result set', async () => {
      jest.spyOn(prisma.measurements, 'findMany').mockResolvedValue([]);

      expect(await service.measurementsV2(0, 5, 'timestamp')).toEqual([]);
    });

    it('should handle database error', async () => {
      jest
        .spyOn(prisma.measurements, 'findMany')
        .mockRejectedValue(new Error('Database error'));

      await expect(service.measurementsV2(0, 5, 'timestamp')).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('MeasurementsFailed', () => {
    it('should return measurements', async () => {
      jest
        .spyOn(prisma.measurements_failed, 'findMany')
        .mockResolvedValue(mockMeasurementFailedModel);

      expect(await service.measurementsFailed()).toMatchObject(
        mockMeasurementDto,
      );
    });

    it('should handle empty result set', async () => {
      jest.spyOn(prisma.measurements_failed, 'findMany').mockResolvedValue([]);

      expect(await service.measurementsFailed()).toEqual([]);
    });

    it('should handle database error', async () => {
      jest
        .spyOn(prisma.measurements_failed, 'findMany')
        .mockRejectedValue(new Error('Database error'));

      await expect(service.measurementsFailed()).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('MeasurementsById', () => {
    it('should return measurements', async () => {
      jest
        .spyOn(prisma.measurements, 'findMany')
        .mockResolvedValue(mockMeasurementModel);

      expect(await service.measurementsById('1')).toMatchObject(
        mockMeasurementDto,
      );
    });

    it('should handle empty result set', async () => {
      jest.spyOn(prisma.measurements, 'findMany').mockResolvedValue([]);

      expect(await service.measurementsById('1')).toEqual([]);
    });

    it('should handle database error', async () => {
      jest
        .spyOn(prisma.measurements, 'findMany')
        .mockRejectedValue(new Error('Database error'));

      await expect(service.measurementsById('1')).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('MeasurementsBySchoolId', () => {
    it('should return measurements', async () => {
      jest
        .spyOn(prisma.measurements, 'findMany')
        .mockResolvedValue(mockMeasurementModel);

      expect(await service.measurementsBySchoolId('123')).toMatchObject(
        mockMeasurementDto,
      );
    });

    it('should handle empty result set', async () => {
      jest.spyOn(prisma.measurements, 'findMany').mockResolvedValue([]);

      expect(await service.measurementsBySchoolId('123')).toEqual([]);
    });

    it('should handle database error', async () => {
      jest
        .spyOn(prisma.measurements, 'findMany')
        .mockRejectedValue(new Error('Database error'));

      await expect(service.measurementsBySchoolId('123')).rejects.toThrow(
        'Database error',
      );
    });
  });
});
