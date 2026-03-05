import { Test, TestingModule } from '@nestjs/testing';
import { MeasurementService } from './measurement.service';
import { PrismaService } from '../prisma/prisma.service';
import { GeolocationUtility } from '../geolocation/geolocation.utility';
import {
  mockAddMeasurementDto,
  mockCountryModel,
  mockGigaSchoolMappingModel,
  mockMeasurementDto,
  mockMeasurementFailedDto,
  mockMeasurementFailedModel,
  mockMeasurementModel,
  mockMeasurementV2Dto,
  mockSchoolModel,
} from '../common/mock-objects';

describe('MeasurementService', () => {
  let service: MeasurementService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const mockGeolocationUtility = {
      calculateDistanceAndSetFlag: jest.fn(),
      updateLatLngColumns: jest.fn(),
      getSchoolCoordinates: jest.fn(),
      calculateDistance: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeasurementService, 
        PrismaService,
        {
          provide: GeolocationUtility,
          useValue: mockGeolocationUtility,
        },
      ],
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
        mockMeasurementDto(false),
      );
    });

    it('should return measurements with lt timestamp filter', async () => {
      jest
        .spyOn(prisma.dailycheckapp_country, 'findFirst')
        .mockResolvedValue(mockCountryModel[0]);
      jest
        .spyOn(prisma.measurements, 'findMany')
        .mockResolvedValue(mockMeasurementModel);

      expect(
        await service.measurements(
          0,
          5,
          'timestamp',
          null,
          null,
          'timestamp',
          'lt',
          new Date('2024-01-14'),
        ),
      ).toMatchObject(mockMeasurementDto(false));
    });

    it('should return measurements with lte timestamp filter', async () => {
      jest
        .spyOn(prisma.dailycheckapp_country, 'findFirst')
        .mockResolvedValue(mockCountryModel[0]);
      jest
        .spyOn(prisma.measurements, 'findMany')
        .mockResolvedValue(mockMeasurementModel);

      expect(
        await service.measurements(
          0,
          5,
          'timestamp',
          null,
          null,
          'timestamp',
          'lte',
          new Date('2024-01-14'),
        ),
      ).toMatchObject(mockMeasurementDto(false));
    });

    it('should return measurements with gt timestamp filter', async () => {
      jest
        .spyOn(prisma.dailycheckapp_country, 'findFirst')
        .mockResolvedValue(mockCountryModel[0]);
      jest
        .spyOn(prisma.measurements, 'findMany')
        .mockResolvedValue(mockMeasurementModel);

      expect(
        await service.measurements(
          0,
          5,
          'timestamp',
          null,
          null,
          'timestamp',
          'gt',
          new Date('2024-01-14'),
        ),
      ).toMatchObject(mockMeasurementDto(false));
    });

    it('should return measurements with gte timestamp filter', async () => {
      jest
        .spyOn(prisma.dailycheckapp_country, 'findFirst')
        .mockResolvedValue(mockCountryModel[0]);
      jest
        .spyOn(prisma.measurements, 'findMany')
        .mockResolvedValue(mockMeasurementModel);

      expect(
        await service.measurements(
          0,
          5,
          'timestamp',
          null,
          null,
          'timestamp',
          'gte',
          new Date('2024-01-14'),
        ),
      ).toMatchObject(mockMeasurementDto(false));
    });

    it('should return measurements with eq timestamp filter', async () => {
      jest
        .spyOn(prisma.dailycheckapp_country, 'findFirst')
        .mockResolvedValue(mockCountryModel[0]);
      jest
        .spyOn(prisma.measurements, 'findMany')
        .mockResolvedValue(mockMeasurementModel);

      expect(
        await service.measurements(
          0,
          5,
          'timestamp',
          null,
          null,
          'timestamp',
          'eq',
          new Date('2024-01-14'),
        ),
      ).toMatchObject(mockMeasurementDto(false));
    });

    it('should return no measurements with country_iso3_code filter and no write_access', async () => {
      jest
        .spyOn(prisma.dailycheckapp_country, 'findFirst')
        .mockResolvedValue(mockCountryModel[0]);
      jest
        .spyOn(prisma.measurements, 'findMany')
        .mockResolvedValue(mockMeasurementModel);

      expect(
        await service.measurements(
          0,
          5,
          'timestamp',
          'b8e7d315-08f9-3665-9173-0d465744e4fe',
          'IND',
        ),
      ).toMatchObject([]);
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

    it('should return measurements with timestamp filter', async () => {
      jest
        .spyOn(prisma.dailycheckapp_country, 'findFirst')
        .mockResolvedValue(mockCountryModel[0]);
      jest
        .spyOn(prisma.measurements, 'findMany')
        .mockResolvedValue(mockMeasurementModel);

      expect(
        await service.measurementsV2(
          0,
          5,
          'timestamp',
          null,
          null,
          'timestamp',
          'eq',
          new Date('2024-01-14'),
        ),
      ).toMatchObject(mockMeasurementV2Dto);
    });

    it('should return no measurements with country_iso3_code filter and no write_access', async () => {
      jest
        .spyOn(prisma.dailycheckapp_country, 'findFirst')
        .mockResolvedValue(mockCountryModel[0]);
      jest
        .spyOn(prisma.measurements, 'findMany')
        .mockResolvedValue(mockMeasurementModel);

      expect(
        await service.measurementsV2(
          0,
          5,
          'timestamp',
          'b8e7d315-08f9-3665-9173-0d465744e4fe',
          'IND',
        ),
      ).toMatchObject([]);
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
        mockMeasurementFailedDto,
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

      expect(await service.measurementsById(1)).toMatchObject(
        mockMeasurementDto(true),
      );
    });

    it('should handle empty result set', async () => {
      jest.spyOn(prisma.measurements, 'findMany').mockResolvedValue([]);

      expect(await service.measurementsById(1)).toEqual([]);
    });

    it('should handle database error', async () => {
      jest
        .spyOn(prisma.measurements, 'findMany')
        .mockRejectedValue(new Error('Database error'));

      await expect(service.measurementsById(1)).rejects.toThrow(
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
        mockMeasurementDto(true),
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

  describe('CreateMeasurement', () => {
    it('should create measurement', async () => {
      jest
        .spyOn(prisma.dailycheckapp_school, 'findFirst')
        .mockResolvedValue(mockSchoolModel[0]);
      jest
        .spyOn(prisma.giga_id_school_mapping_fix, 'findFirst')
        .mockResolvedValue(null);
      jest
        .spyOn(prisma.measurements, 'create')
        .mockResolvedValue(mockMeasurementModel[0]);

      const response = await service.createMeasurement(
        mockAddMeasurementDto[0],
      );
      expect(response).toEqual('');
    });

    it('should create measurement with correct giga mapping', async () => {
      jest
        .spyOn(prisma.dailycheckapp_school, 'findFirst')
        .mockResolvedValue(mockSchoolModel[0]);
      jest
        .spyOn(prisma.giga_id_school_mapping_fix, 'findFirst')
        .mockResolvedValue(mockGigaSchoolMappingModel[1]);
      jest
        .spyOn(prisma.measurements, 'create')
        .mockResolvedValue(mockMeasurementModel[1]);

      const response = await service.createMeasurement(
        mockAddMeasurementDto[1],
      );
      expect(response).toEqual('');
    });

    it('should create failed measurement if school doesnt exist', async () => {
      jest
        .spyOn(prisma.dailycheckapp_school, 'findFirst')
        .mockResolvedValue(null);
      jest
        .spyOn(prisma.measurements_failed, 'create')
        .mockResolvedValue(mockMeasurementFailedModel[0]);

      const response = await service.createMeasurement(
        mockAddMeasurementDto[0],
      );
      expect(response).toEqual('PCDC school does not exist');
    });

    it('should create failed measurement if wrong country code', async () => {
      jest
        .spyOn(prisma.dailycheckapp_school, 'findFirst')
        .mockResolvedValue(mockSchoolModel[0]);
      jest
        .spyOn(prisma.giga_id_school_mapping_fix, 'findFirst')
        .mockResolvedValue(mockGigaSchoolMappingModel[0]);
      jest
        .spyOn(prisma.measurements_failed, 'create')
        .mockResolvedValue(mockMeasurementFailedModel[0]);

      const response = await service.createMeasurement(
        mockAddMeasurementDto[0],
      );
      expect(response).toEqual('Wrong country code');
    });

    it('should handle database error', async () => {
      jest
        .spyOn(prisma.dailycheckapp_school, 'findFirst')
        .mockResolvedValue(mockSchoolModel[0]);
      jest
        .spyOn(prisma.giga_id_school_mapping_fix, 'findFirst')
        .mockResolvedValue(null);
      jest
        .spyOn(prisma.measurements, 'create')
        .mockRejectedValue(new Error('Database error'));

      await expect(
        service.createMeasurement(mockAddMeasurementDto[0]),
      ).rejects.toThrow('Database error');
    });
  });
  describe('createMultipleMeasurement', () => {
    it('should create multiple measurements', async () => {
      jest
        .spyOn(prisma.dailycheckapp_school, 'findFirst')
        .mockResolvedValue(mockSchoolModel[0]);
      jest
        .spyOn(prisma.giga_id_school_mapping_fix, 'findFirst')
        .mockResolvedValue(null);
      jest
        .spyOn(prisma.measurements, 'create')
        .mockResolvedValue(mockMeasurementModel[0]);

      const response = await service.createMultipleMeasurement([
        { ...mockAddMeasurementDto[0], Results: {}, app_version: '1.0.9' },
      ]);
      expect(response.length).toBe(0);
    });
  });
});
