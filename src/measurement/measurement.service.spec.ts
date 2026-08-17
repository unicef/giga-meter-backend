import { Test, TestingModule } from '@nestjs/testing';
import { MeasurementService } from './measurement.service';
import { AddMeasurementDto } from './measurement.dto';
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

    it('should lowercase the giga_id_school filter', async () => {
      // measurements.giga_id_school is always persisted lowercase, so the
      // filter has to be normalised or the usage page stays empty for clients
      // that hold the id in a different casing.
      const findManySpy = jest
        .spyOn(prisma.measurements, 'findMany')
        .mockResolvedValue(mockMeasurementModel);

      await service.measurements(0, 5, 'timestamp', ' TZ-TEST-88001 ');

      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            giga_id_school: 'tz-test-88001',
          }),
        }),
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

    it('should match the school regardless of the casing sent by the client', async () => {
      const schoolSpy = jest
        .spyOn(prisma.dailycheckapp_school, 'findFirst')
        .mockResolvedValue(mockSchoolModel[0]);
      const mappingSpy = jest
        .spyOn(prisma.giga_id_school_mapping_fix, 'findFirst')
        .mockResolvedValue(null);
      jest
        .spyOn(prisma.measurements, 'create')
        .mockResolvedValue(mockMeasurementModel[0]);

      // The client sends the id with the casing the schools master returned,
      // while dailycheckapp_school stores it lowercased.
      const response = await service.createMeasurement({
        ...mockAddMeasurementDto[0],
        giga_id_school: 'TZ-TEST-88001',
      });

      expect(response).toEqual('');
      expect(schoolSpy).toHaveBeenCalledWith({
        where: {
          giga_id_school: { equals: 'TZ-TEST-88001', mode: 'insensitive' },
        },
      });
      expect(mappingSpy).toHaveBeenCalledWith({
        where: {
          giga_id_school_wrong: {
            equals: 'TZ-TEST-88001',
            mode: 'insensitive',
          },
        },
      });
    });

    it('should trim the giga id before looking the school up', async () => {
      const schoolSpy = jest
        .spyOn(prisma.dailycheckapp_school, 'findFirst')
        .mockResolvedValue(mockSchoolModel[0]);
      jest
        .spyOn(prisma.giga_id_school_mapping_fix, 'findFirst')
        .mockResolvedValue(null);
      jest
        .spyOn(prisma.measurements, 'create')
        .mockResolvedValue(mockMeasurementModel[0]);

      await service.createMeasurement({
        ...mockAddMeasurementDto[0],
        giga_id_school: '  tz-test-88001  ',
      });

      expect(schoolSpy).toHaveBeenCalledWith({
        where: {
          giga_id_school: { equals: 'tz-test-88001', mode: 'insensitive' },
        },
      });
    });

    it('should leave a missing giga id untouched in the lookup filter', async () => {
      const schoolSpy = jest
        .spyOn(prisma.dailycheckapp_school, 'findFirst')
        .mockResolvedValue(mockSchoolModel[0]);
      jest
        .spyOn(prisma.giga_id_school_mapping_fix, 'findFirst')
        .mockResolvedValue(null);
      jest
        .spyOn(prisma.measurements, 'create')
        .mockResolvedValue(mockMeasurementModel[0]);

      await service.createMeasurement({
        ...mockAddMeasurementDto[0],
        giga_id_school: undefined,
      });

      expect(schoolSpy).toHaveBeenCalledWith({
        where: { giga_id_school: undefined },
      });
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

    it('should persist mlab protocol with null quality metrics by default', async () => {
      jest
        .spyOn(prisma.dailycheckapp_school, 'findFirst')
        .mockResolvedValue(mockSchoolModel[0]);
      jest
        .spyOn(prisma.giga_id_school_mapping_fix, 'findFirst')
        .mockResolvedValue(null);
      const createSpy = jest
        .spyOn(prisma.measurements, 'create')
        .mockResolvedValue(mockMeasurementModel[0]);

      await service.createMeasurement(mockAddMeasurementDto[0]);

      expect(createSpy).toHaveBeenCalledWith({
        data: expect.objectContaining({
          protocol: 'mlab',
          download_latency: null,
          upload_latency: null,
          download_jitter: null,
          upload_jitter: null,
          jitter: null,
          packet_loss: null,
          network_quality_score: null,
        }),
      });
    });

    it('should persist cloudflare protocol and derived quality metrics', async () => {
      jest
        .spyOn(prisma.dailycheckapp_school, 'findFirst')
        .mockResolvedValue(mockSchoolModel[0]);
      jest
        .spyOn(prisma.giga_id_school_mapping_fix, 'findFirst')
        .mockResolvedValue(null);
      const createSpy = jest
        .spyOn(prisma.measurements, 'create')
        .mockResolvedValue(mockMeasurementModel[0]);

      await service.createMeasurement(
        {
          ...mockAddMeasurementDto[0],
          Results: {
            summary: {
              downLoadedLatency: 10,
              upLoadedLatency: 20,
              downLoadedJitter: 1,
              upLoadedJitter: 2,
              jitter: 3,
            },
            scores: {
              streaming: { points: 10 },
              gaming: { points: 20 },
              rtc: { points: 30 },
            },
          } as AddMeasurementDto['Results'],
        },
        'cloudflare',
      );

      expect(createSpy).toHaveBeenCalledWith({
        data: expect.objectContaining({
          protocol: 'cloudflare',
          download_latency: 10,
          upload_latency: 20,
          download_jitter: 1,
          upload_jitter: 2,
          jitter: 3,
          packet_loss: null,
          network_quality_score: 20,
        }),
      });
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
