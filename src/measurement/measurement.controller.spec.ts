import { Test, TestingModule } from '@nestjs/testing';
import { MeasurementController } from './measurement.controller';
import { MeasurementService } from './measurement.service';
import { AuthGuard } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { HttpModule } from '@nestjs/axios';
import {
  mockMeasurementDto,
  mockMeasurementV2Dto,
} from '../common/mock-objects';

describe('MeasurementController', () => {
  let controller: MeasurementController;
  let service: MeasurementService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [MeasurementController],
      providers: [MeasurementService, PrismaService, AuthGuard],
      imports: [HttpModule],
    }).compile();

    controller = app.get<MeasurementController>(MeasurementController);
    service = app.get<MeasurementService>(MeasurementService);
  });

  it('controller should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('service should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('GetMeasurements', () => {
    it('should get measurements', async () => {
      jest.spyOn(service, 'measurements').mockResolvedValue(mockMeasurementDto);

      const response = await controller.getMeasurements();
      expect(response.data).toStrictEqual(mockMeasurementDto);
    });

    it('should handle empty result set', async () => {
      jest.spyOn(service, 'measurements').mockResolvedValue([]);

      const response = await controller.getMeasurements();
      expect(response.data).toStrictEqual([]);
    });

    it('should handle database error', async () => {
      jest
        .spyOn(service, 'measurements')
        .mockRejectedValue(new Error('Database error'));
      await expect(controller.getMeasurements()).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('GetMeasurementsV2', () => {
    it('should get measurements', async () => {
      jest
        .spyOn(service, 'measurementsV2')
        .mockResolvedValue(mockMeasurementV2Dto);

      const response = await controller.getMeasurementsV2();
      expect(response).toStrictEqual(mockMeasurementV2Dto);
    });

    it('should handle empty result set', async () => {
      jest.spyOn(service, 'measurementsV2').mockResolvedValue([]);

      const response = await controller.getMeasurementsV2();
      expect(response).toStrictEqual([]);
    });

    it('should handle database error', async () => {
      jest
        .spyOn(service, 'measurementsV2')
        .mockRejectedValue(new Error('Database error'));
      await expect(controller.getMeasurementsV2()).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('GetMeasurementsFailed', () => {
    it('should get measurements', async () => {
      jest
        .spyOn(service, 'measurementsFailed')
        .mockResolvedValue(mockMeasurementDto);

      const response = await controller.getMeasurementsFailed();
      expect(response.data).toStrictEqual(mockMeasurementDto);
    });

    it('should handle empty result set', async () => {
      jest.spyOn(service, 'measurementsFailed').mockResolvedValue([]);

      const response = await controller.getMeasurementsFailed();
      expect(response.data).toStrictEqual([]);
    });

    it('should handle database error', async () => {
      jest
        .spyOn(service, 'measurementsFailed')
        .mockRejectedValue(new Error('Database error'));
      await expect(controller.getMeasurementsFailed()).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('GetMeasurementsById', () => {
    it('should get measurements', async () => {
      const record = mockMeasurementDto.filter((x) => x.id === '1');
      jest.spyOn(service, 'measurementsById').mockResolvedValue(record);

      const response = await controller.getMeasurementsById('1');
      expect(response.data).toStrictEqual(record);
    });

    it('should handle empty result set', async () => {
      jest.spyOn(service, 'measurementsById').mockResolvedValue([]);

      const response = await controller.getMeasurementsById('1');
      expect(response.data).toStrictEqual([]);
    });

    it('should handle database error', async () => {
      jest
        .spyOn(service, 'measurementsById')
        .mockRejectedValue(new Error('Database error'));
      await expect(controller.getMeasurementsById('1')).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('GetMeasurementsBySchoolId', () => {
    it('should get measurements', async () => {
      jest
        .spyOn(service, 'measurementsBySchoolId')
        .mockResolvedValue(mockMeasurementDto);

      const response = await controller.getMeasurementsBySchoolId('1234');
      expect(response.data).toStrictEqual(mockMeasurementDto);
    });

    it('should handle empty result set', async () => {
      jest.spyOn(service, 'measurementsBySchoolId').mockResolvedValue([]);

      const response = await controller.getMeasurementsBySchoolId('1234');
      expect(response.data).toStrictEqual([]);
    });

    it('should handle database error', async () => {
      jest
        .spyOn(service, 'measurementsBySchoolId')
        .mockRejectedValue(new Error('Database error'));
      await expect(
        controller.getMeasurementsBySchoolId('1234'),
      ).rejects.toThrow('Database error');
    });
  });

  describe('CreateMeasurement', () => {
    it('should create measurement', async () => {
      jest.spyOn(service, 'createMeasurement').mockResolvedValue('');

      const response = await controller.createMeasurement(
        mockMeasurementDto[0],
      );
      expect(response.data.user_id).toBeDefined();
    });

    it('should handle database error', async () => {
      jest
        .spyOn(service, 'createMeasurement')
        .mockRejectedValue(new Error('Database error'));
      await expect(
        controller.createMeasurement(mockMeasurementDto[0]),
      ).rejects.toThrow('Database error');
    });
  });
});
