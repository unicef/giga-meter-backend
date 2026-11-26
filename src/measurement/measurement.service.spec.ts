import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { MeasurementService } from './measurement.service';
import { AddMeasurementDto } from './measurement.dto';
import { PrismaService } from '../prisma/prisma.service';
import { GeolocationUtility } from '../geolocation/geolocation.utility';
import { DeviceIdService } from '../school/device-id.service';
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
  let deviceIdService: {
    resolve: jest.Mock;
    lock: jest.Mock;
    assign: jest.Mock;
  };

  beforeEach(async () => {
    const mockGeolocationUtility = {
      calculateDistanceAndSetFlag: jest.fn(),
      updateLatLngColumns: jest.fn(),
      getSchoolCoordinates: jest.fn(),
      calculateDistance: jest.fn(),
    };

    deviceIdService = {
      resolve: jest.fn(),
      lock: jest.fn(),
      assign: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeasurementService, 
        PrismaService,
        {
          provide: GeolocationUtility,
          useValue: mockGeolocationUtility,
        },
        { provide: DeviceIdService, useValue: deviceIdService },
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

    it('should return a null latency for a row without one', async () => {
      // latency is nullable: a test whose server sent no measurement has none.
      jest
        .spyOn(prisma.measurements, 'findMany')
        .mockResolvedValue([{ ...mockMeasurementModel[0], latency: null }]);

      const [measurement] = await service.measurements(0, 5, 'timestamp');

      expect(measurement.Latency).toBeNull();
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

    it('should return a null latency for a row without one', async () => {
      jest
        .spyOn(prisma.measurements, 'findMany')
        .mockResolvedValue([{ ...mockMeasurementModel[0], latency: null }]);

      const [measurement] = await service.measurementsV2(0, 5, 'timestamp');

      expect(measurement.latency).toBeNull();
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

    it('should return a null latency for a row without one', async () => {
      jest
        .spyOn(prisma.measurements_failed, 'findMany')
        .mockResolvedValue([
          { ...mockMeasurementFailedModel[0], latency: null },
        ]);

      const [measurement] = await service.measurementsFailed();

      expect(measurement.Latency).toBeNull();
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
        where: { giga_id_school: 'tz-test-88001' },
      });
      expect(mappingSpy).toHaveBeenCalledWith({
        where: { giga_id_school_wrong: 'tz-test-88001' },
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
        where: { giga_id_school: 'tz-test-88001' },
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

    describe('device ID (TECH-8828)', () => {
      const browserId = 'registration-user-id';
      // The hardware values a 2.0.4 app sends with a measurement.
      const withValues = {
        ...mockAddMeasurementDto[0],
        BrowserID: browserId,
        device_hardware_id: 'uuid-a',
        device_context: {
          baseboard_serial: 'board-b',
          disk_serial: 'disk-c',
          machine_guid: 'guid-m',
        },
      };
      const sent = {
        firmware_uuid: 'uuid-a',
        baseboard_serial: 'board-b',
        disk_serial: 'disk-c',
        machine_guid: 'guid-m',
      };
      let schoolSpy: jest.SpyInstance;
      let createSpy: jest.SpyInstance;
      let tx: any;

      beforeEach(() => {
        // First the school check, then the registration it was made under.
        schoolSpy = jest
          .spyOn(prisma.dailycheckapp_school, 'findFirst')
          .mockResolvedValueOnce(mockSchoolModel[0]);
        jest
          .spyOn(prisma.giga_id_school_mapping_fix, 'findFirst')
          .mockResolvedValue(null);
        createSpy = jest
          .spyOn(prisma.measurements, 'create')
          .mockResolvedValue(mockMeasurementModel[0]);
        deviceIdService.resolve.mockResolvedValue({
          device_id: 'device-1',
          flags: [],
          counting: ['firmware_uuid', 'baseboard_serial', 'disk_serial'],
        });
        tx = {
          dailycheckapp_school: {
            findUnique: jest.fn().mockResolvedValue({ device_id: null }),
            update: jest.fn(),
          },
        };
        jest
          .spyOn(prisma, '$transaction')
          .mockImplementation((fn: any) => fn(tx));
      });

      const stored = () => createSpy.mock.calls[0][0].data.device_id;

      it("matches the measurement's own values, by the registration rules", async () => {
        schoolSpy.mockResolvedValueOnce({
          id: BigInt(7),
          device_id: 'device-1',
          device_hardware_id: 'uuid-a',
        });

        await service.createMeasurement(withValues);

        expect(schoolSpy).toHaveBeenCalledWith({
          where: { user_id: browserId },
          orderBy: { id: 'desc' },
          select: { id: true, device_id: true, device_hardware_id: true },
        });
        expect(deviceIdService.resolve).toHaveBeenCalledWith(prisma, sent);
        expect(stored()).toBe('device-1');
      });

      it("goes by its own values, not its registration's device ID", async () => {
        // A registration an older app took over from another PC.
        schoolSpy.mockResolvedValueOnce({
          id: BigInt(7),
          device_id: 'other-pc',
          device_hardware_id: 'uuid-a',
        });

        await service.createMeasurement(withValues);

        expect(stored()).toBe('device-1');
      });

      describe('app instance', () => {
        const INSTANCE = '6f1c2b8e-4d3a-4f5e-9a7b-1c2d3e4f5a6b';
        let findUnique: jest.SpyInstance;

        beforeEach(() => {
          findUnique = jest.spyOn(prisma.dailycheckapp_school, 'findUnique');
          deviceIdService.assign.mockResolvedValue({
            device_id: 'device-new',
            device_id_flags: [],
          });
        });

        it('stores the app instance ID it sends, lowercased, and none for a bad one', async () => {
          findUnique.mockResolvedValue(null);
          // Registration of the first; school, then registration, of the second.
          schoolSpy
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(mockSchoolModel[0])
            .mockResolvedValueOnce(null);

          await service.createMeasurement({
            ...withValues,
            app_instance_id: INSTANCE.toUpperCase(),
          });
          await service.createMeasurement({
            ...withValues,
            app_instance_id: 'not-a-uuid',
          });

          expect(createSpy.mock.calls[0][0].data.app_instance_id).toBe(
            INSTANCE,
          );
          expect(createSpy.mock.calls[1][0].data.app_instance_id).toBeNull();
        });

        it('finds its registration by app instance, not by browser ID', async () => {
          findUnique.mockResolvedValue({
            id: BigInt(9),
            device_id: null,
            device_hardware_id: 'uuid-a',
          });

          await service.createMeasurement({
            ...withValues,
            app_instance_id: INSTANCE,
          });

          expect(findUnique).toHaveBeenCalledWith({
            where: { app_instance_id: INSTANCE },
            select: { id: true, device_id: true, device_hardware_id: true },
          });
          // Only the school check went by giga ID; none by user_id.
          expect(schoolSpy).toHaveBeenCalledTimes(1);
          expect(tx.dailycheckapp_school.update).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: BigInt(9) } }),
          );
          expect(stored()).toBe('device-new');
        });

        it("goes by browser ID while its instance's registration isn't stored yet", async () => {
          findUnique.mockResolvedValue(null);
          schoolSpy.mockResolvedValueOnce({
            id: BigInt(7),
            device_id: 'reg-device',
            device_hardware_id: null,
          });

          await service.createMeasurement({
            ...mockAddMeasurementDto[0],
            BrowserID: browserId,
            app_instance_id: INSTANCE,
          });

          expect(schoolSpy).toHaveBeenCalledWith(
            expect.objectContaining({ where: { user_id: browserId } }),
          );
          expect(stored()).toBe('reg-device');
        });
      });

      it('stores none when its values give none', async () => {
        schoolSpy.mockResolvedValueOnce(null);
        deviceIdService.resolve.mockResolvedValue({
          device_id: null,
          flags: ['firmware_uuid_shared'],
          counting: [],
        });

        await service.createMeasurement({
          ...withValues,
          device_context: undefined,
        });

        expect(stored()).toBeNull();
      });

      describe('a registration without a device ID (before 2.0.4)', () => {
        beforeEach(() => {
          schoolSpy.mockResolvedValueOnce({
            id: BigInt(7),
            device_id: null,
            device_hardware_id: 'uuid-a',
          });
          deviceIdService.assign.mockResolvedValue({
            device_id: 'device-new',
            device_id_flags: [],
          });
        });

        it('completes it with this PC: values and device ID, under the locks', async () => {
          await service.createMeasurement(withValues);

          expect(deviceIdService.lock).toHaveBeenCalledWith(tx, sent);
          expect(deviceIdService.assign).toHaveBeenCalledWith(tx, sent);
          expect(tx.dailycheckapp_school.update).toHaveBeenCalledWith({
            where: { id: BigInt(7) },
            data: {
              baseboard_serial: 'board-b',
              disk_serial: 'disk-c',
              machine_guid: 'guid-m',
              device_id: 'device-new',
              device_id_flags: [],
            },
          });
          expect(deviceIdService.resolve).not.toHaveBeenCalled();
          expect(stored()).toBe('device-new');
        });

        it("doesn't when it has another firmware UUID", async () => {
          await service.createMeasurement({
            ...withValues,
            device_hardware_id: 'uuid-other',
          });

          expect(prisma.$transaction).not.toHaveBeenCalled();
          expect(deviceIdService.resolve).toHaveBeenCalled();
          expect(stored()).toBe('device-1');
        });

        it('matches as usual when another measurement completed it meanwhile', async () => {
          tx.dailycheckapp_school.findUnique.mockResolvedValue({
            device_id: 'device-x',
          });

          await service.createMeasurement(withValues);

          expect(deviceIdService.assign).not.toHaveBeenCalled();
          expect(tx.dailycheckapp_school.update).not.toHaveBeenCalled();
          expect(stored()).toBe('device-1');
        });
      });

      it("takes its registration's device ID when it has no hardware value", async () => {
        // An app older than hardware IDs.
        schoolSpy.mockResolvedValueOnce({
          id: BigInt(7),
          device_id: 'reg-device',
          device_hardware_id: null,
        });

        await service.createMeasurement({
          ...mockAddMeasurementDto[0],
          BrowserID: browserId,
        });

        expect(deviceIdService.resolve).not.toHaveBeenCalled();
        expect(stored()).toBe('reg-device');
      });

      it('stores none without values or a browser ID', async () => {
        await service.createMeasurement({
          ...mockAddMeasurementDto[0],
          BrowserID: undefined,
        });

        expect(schoolSpy).toHaveBeenCalledTimes(1);
        expect(stored()).toBeNull();
      });

      it('still stores the measurement when working it out fails', async () => {
        schoolSpy.mockResolvedValueOnce(null);
        deviceIdService.resolve.mockRejectedValue(new Error('connection lost'));

        const response = await service.createMeasurement(withValues);

        expect(response).toEqual('');
        expect(stored()).toBeNull();
      });
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

    it('should persist offline_synced and schedule context sent by the app', async () => {
      jest
        .spyOn(prisma.dailycheckapp_school, 'findFirst')
        .mockResolvedValue(mockSchoolModel[0]);
      jest
        .spyOn(prisma.giga_id_school_mapping_fix, 'findFirst')
        .mockResolvedValue(null);
      const createSpy = jest
        .spyOn(prisma.measurements, 'create')
        .mockResolvedValue(mockMeasurementModel[0]);

      const scheduledAt = new Date('2026-08-14T08:23:00.000Z');
      await service.createMeasurement({
        ...mockAddMeasurementDto[0],
        offline_synced: true,
        scheduled_slot: 'morning',
        scheduled_at: scheduledAt,
      });

      expect(createSpy).toHaveBeenCalledWith({
        data: expect.objectContaining({
          offline_synced: true,
          scheduled_slot: 'morning',
          scheduled_at: scheduledAt,
        }),
      });
    });

    it('should default offline_synced and schedule context when the app omits them', async () => {
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
          offline_synced: false,
          scheduled_slot: null,
          scheduled_at: null,
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

    it('should store absent Json values as SQL NULL, not as JSON null', async () => {
      jest
        .spyOn(prisma.dailycheckapp_school, 'findFirst')
        .mockResolvedValue(mockSchoolModel[0]);
      jest
        .spyOn(prisma.giga_id_school_mapping_fix, 'findFirst')
        .mockResolvedValue(null);
      const createSpy = jest
        .spyOn(prisma.measurements, 'create')
        .mockResolvedValue(mockMeasurementModel[0]);

      await service.createMeasurement({
        ...mockAddMeasurementDto[0],
        ClientInfo: null,
        ServerInfo: undefined,
        Results: null,
        wifi_connections: null,
        device_context: undefined,
      });

      // A plain null in a Json? column is stored as 'null'::jsonb, which
      // `IS NOT NULL` does not filter out.
      expect(createSpy).toHaveBeenCalledWith({
        data: expect.objectContaining({
          client_info: Prisma.DbNull,
          server_info: Prisma.DbNull,
          results: Prisma.DbNull,
          wifi_connections: Prisma.DbNull,
          device_context: Prisma.DbNull,
        }),
      });
    });

    it('should store device_context as SQL NULL when no key survives the whitelist', async () => {
      jest
        .spyOn(prisma.dailycheckapp_school, 'findFirst')
        .mockResolvedValue(mockSchoolModel[0]);
      jest
        .spyOn(prisma.giga_id_school_mapping_fix, 'findFirst')
        .mockResolvedValue(null);
      const createSpy = jest
        .spyOn(prisma.measurements, 'create')
        .mockResolvedValue(mockMeasurementModel[0]);

      await service.createMeasurement({
        ...mockAddMeasurementDto[0],
        device_context: { not_whitelisted: 'x' },
      });

      expect(createSpy).toHaveBeenCalledWith({
        data: expect.objectContaining({ device_context: Prisma.DbNull }),
      });
    });

    it('should keep Json values that are present', async () => {
      jest
        .spyOn(prisma.dailycheckapp_school, 'findFirst')
        .mockResolvedValue(mockSchoolModel[0]);
      jest
        .spyOn(prisma.giga_id_school_mapping_fix, 'findFirst')
        .mockResolvedValue(null);
      const createSpy = jest
        .spyOn(prisma.measurements, 'create')
        .mockResolvedValue(mockMeasurementModel[0]);
      const wifi = [{ ssid: 'school-wifi', signal: 80 }];

      await service.createMeasurement({
        ...mockAddMeasurementDto[0],
        wifi_connections: wifi,
        device_context: { connection_type: 'wifi' },
      });

      expect(createSpy).toHaveBeenCalledWith({
        data: expect.objectContaining({
          client_info: mockAddMeasurementDto[0].ClientInfo,
          wifi_connections: wifi,
          device_context: { connection_type: 'wifi' },
        }),
      });
    });

    it('should store absent Json values as SQL NULL on a failed measurement', async () => {
      jest
        .spyOn(prisma.dailycheckapp_school, 'findFirst')
        .mockResolvedValue(null);
      const createSpy = jest
        .spyOn(prisma.measurements_failed, 'create')
        .mockResolvedValue(mockMeasurementFailedModel[0]);

      await service.createMeasurement({
        ...mockAddMeasurementDto[0],
        Results: null,
        device_context: undefined,
      });

      expect(createSpy).toHaveBeenCalledWith({
        data: expect.objectContaining({
          results: Prisma.DbNull,
          device_context: Prisma.DbNull,
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
