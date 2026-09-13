import { Test, TestingModule } from '@nestjs/testing';
import { SchoolService } from './school.service';
import { PrismaService } from '../prisma/prisma.service';
import { GeolocationUtility } from '../geolocation/geolocation.utility';
import {
  mockCountryModel,
  mockSchoolDto,
  mockSchoolModel,
} from '../common/mock-objects';

describe('SchoolService', () => {
  let service: SchoolService;
  let prisma: PrismaService;
  let geolocation: GeolocationUtility;

  beforeEach(async () => {
    const mockGeolocationUtility = {
      calculateDistanceAndSetFlag: jest.fn(),
      updateLatLngColumns: jest.fn(),
      getSchoolCoordinates: jest.fn(),
      calculateDistance: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchoolService, 
        PrismaService,
        {
          provide: GeolocationUtility,
          useValue: mockGeolocationUtility,
        },
      ],
    }).compile();

    service = module.get<SchoolService>(SchoolService);
    prisma = module.get<PrismaService>(PrismaService);
    geolocation = module.get<GeolocationUtility>(GeolocationUtility);

    jest.spyOn(prisma.school, 'findFirst').mockResolvedValue(null);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Schools', () => {
    it('should return schools', async () => {
      jest
        .spyOn(prisma.dailycheckapp_school, 'findMany')
        .mockResolvedValue(mockSchoolModel);

      expect(await service.schools()).toEqual(mockSchoolDto);
    });

    it('should return no school with country_iso3_code filter and no write_access', async () => {
      jest
        .spyOn(prisma.dailycheckapp_country, 'findFirst')
        .mockResolvedValue(mockCountryModel[0]);
      jest
        .spyOn(prisma.dailycheckapp_school, 'findMany')
        .mockResolvedValue(mockSchoolModel);

      expect(await service.schools(0, 5, null, 'IND')).toEqual([]);
    });

    it('should handle empty result set', async () => {
      jest.spyOn(prisma.dailycheckapp_school, 'findMany').mockResolvedValue([]);

      expect(await service.schools()).toEqual([]);
    });

    it('should handle database error', async () => {
      jest
        .spyOn(prisma.dailycheckapp_school, 'findMany')
        .mockRejectedValue(new Error('Database error'));

      await expect(service.schools()).rejects.toThrow('Database error');
    });
  });

  describe('SchoolsByGigaId', () => {
    it('should return schools', async () => {
      jest
        .spyOn(prisma.dailycheckapp_school, 'findMany')
        .mockResolvedValue(mockSchoolModel);

      const schools = await service.schoolsByGigaId('gigaid1');
      expect(schools).toEqual(mockSchoolDto);
    });

    it('should handle empty result set', async () => {
      jest.spyOn(prisma.dailycheckapp_school, 'findMany').mockResolvedValue([]);

      const schools = await service.schoolsByGigaId('gigaid3');
      expect(schools).toEqual([]);
    });

    it('should handle database error', async () => {
      jest
        .spyOn(prisma.dailycheckapp_school, 'findMany')
        .mockRejectedValue(new Error('Database error'));

      await expect(service.schoolsByGigaId('gigaid0')).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('SchoolsById', () => {
    it('should return schools', async () => {
      jest
        .spyOn(prisma.dailycheckapp_school, 'findMany')
        .mockResolvedValue(mockSchoolModel);

      const schools = await service.schoolsById(1);
      expect(schools).toEqual(mockSchoolDto);
    });

    it('should handle empty result set', async () => {
      jest.spyOn(prisma.dailycheckapp_school, 'findMany').mockResolvedValue([]);

      const schools = await service.schoolsById(4);
      expect(schools).toEqual([]);
    });

    it('should handle database error', async () => {
      jest
        .spyOn(prisma.dailycheckapp_school, 'findMany')
        .mockRejectedValue(new Error('Database error'));

      await expect(service.schoolsById(0)).rejects.toThrow('Database error');
    });
  });

  describe('SchoolsByCountryId', () => {
    it('should return schools', async () => {
      jest
        .spyOn(prisma.dailycheckapp_school, 'findMany')
        .mockResolvedValue(mockSchoolModel);

      const schools = await service.schoolsByCountryId('IN');
      expect(schools).toEqual(mockSchoolDto);
    });

    it('should handle empty result set', async () => {
      jest.spyOn(prisma.dailycheckapp_school, 'findMany').mockResolvedValue([]);

      const schools = await service.schoolsByCountryId('IN');
      expect(schools).toEqual([]);
    });

    it('should handle database error', async () => {
      jest
        .spyOn(prisma.dailycheckapp_school, 'findMany')
        .mockRejectedValue(new Error('Database error'));

      await expect(service.schoolsByCountryId('IN')).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('CheckNotify', () => {
    it('should return notify', async () => {
      jest
        .spyOn(prisma.dailycheckapp_school, 'findFirstOrThrow')
        .mockResolvedValue({ ...mockSchoolModel[0], 
          detected_latitude: null,
          detected_longitude: null,
          detected_location_accuracy: null,
          detected_location_distance: null,
          detected_location_is_flagged: false
        });
      jest
        .spyOn(prisma.dailycheckapp_school, 'updateMany')
        .mockResolvedValue(null);

      const notify = await service.checkNotify(mockSchoolModel[0].user_id);
      expect(notify).toEqual(true);
    });

    it('should handle school not found', async () => {
      jest
        .spyOn(prisma.dailycheckapp_school, 'findFirstOrThrow')
        .mockRejectedValue(new Error('School not found'));

      await expect(service.checkNotify('232')).rejects.toThrow(
        'School not found',
      );
    });

    it('should handle database error', async () => {
      jest
        .spyOn(prisma.dailycheckapp_school, 'findFirstOrThrow')
        .mockRejectedValue(new Error('Database error'));

      await expect(service.checkNotify('000')).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('CreateSchool', () => {
    it('should create country', async () => {
      jest
        .spyOn(prisma.dailycheckapp_school, 'create')
        .mockResolvedValue(mockSchoolModel[0]);

      const countryId = await service.createSchool(mockSchoolDto[0]);
      expect(countryId).toEqual(mockSchoolDto[0].user_id);
    });

    it('should handle database error', async () => {
      jest
        .spyOn(prisma.dailycheckapp_school, 'create')
        .mockRejectedValue(new Error('Database error'));

      await expect(service.createSchool(mockSchoolDto[0])).rejects.toThrow(
        'Database error',
      );
    });

    it('should return the existing registration instead of creating a duplicate', async () => {
      // Same device, same school: a repeat POST (double tap, network retry)
      // must not mint another user_id.
      const existing = {
        ...mockSchoolModel[0],
        user_id: 'existing_user_id',
        device_hardware_id: 'hardware-1',
      };
      const findFirstSpy = jest
        .spyOn(prisma.dailycheckapp_school, 'findFirst')
        .mockResolvedValue(existing);
      const createSpy = jest.spyOn(prisma.dailycheckapp_school, 'create');

      const response = await service.createSchool({
        ...mockSchoolDto[0],
        device_hardware_id: 'hardware-1',
      });

      // createSchool returns the bare user_id on main. The is_verified field
      // this test asserted on staging arrives with the admin-meter work; when
      // that merges, restore the object assertion here.
      expect(response).toBe('existing_user_id');
      expect(createSpy).not.toHaveBeenCalled();
      expect(findFirstSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            device_hardware_id: 'hardware-1',
            giga_id_school: { equals: 'gigaid1', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('should leave the stored row untouched on a duplicate', async () => {
      // The payload's device context is not copied onto the row: measurements
      // already carry their own app_version, ip_address, country_code,
      // windows_username, installed_path and wifi_connections, so the live
      // values are there and this row stays a record of the registration.
      const existing = {
        ...mockSchoolModel[0],
        user_id: 'existing_user_id',
        device_hardware_id: 'hardware-1',
      };
      jest
        .spyOn(prisma.dailycheckapp_school, 'findFirst')
        .mockResolvedValue(existing);
      const updateSpy = jest.spyOn(prisma.dailycheckapp_school, 'update');
      const updateManySpy = jest.spyOn(
        prisma.dailycheckapp_school,
        'updateMany',
      );

      await service.createSchool({
        ...mockSchoolDto[0],
        device_hardware_id: 'hardware-1',
        os: 'Windows 11',
        app_version: '2.0.5',
        ip_address: '10.0.0.9',
      });

      expect(updateSpy).not.toHaveBeenCalled();
      expect(updateManySpy).not.toHaveBeenCalled();
    });

    it('should not run the geolocation work for a duplicate', async () => {
      // The distance calculation is a school lookup plus a computation whose
      // result is discarded once the registration turns out to exist.
      const existing = {
        ...mockSchoolModel[0],
        device_hardware_id: 'hardware-1',
      };
      jest
        .spyOn(prisma.dailycheckapp_school, 'findFirst')
        .mockResolvedValue(existing);

      await service.createSchool({
        ...mockSchoolDto[0],
        device_hardware_id: 'hardware-1',
        geolocation: { location: { lat: 1, lng: 2 }, accuracy: 10 },
      });

      expect(geolocation.calculateDistanceAndSetFlag).not.toHaveBeenCalled();
    });

    it('should register again when the device only has a deactivated row', async () => {
      // Logging out deactivates the row, and registering afterwards is a new
      // installation: the lookup asks for active rows only, so the deactivated
      // one is invisible to it and the insert goes ahead.
      const findFirstSpy = jest
        .spyOn(prisma.dailycheckapp_school, 'findFirst')
        .mockResolvedValue(null);
      const createSpy = jest
        .spyOn(prisma.dailycheckapp_school, 'create')
        .mockResolvedValue(mockSchoolModel[0]);

      const response = await service.createSchool({
        ...mockSchoolDto[0],
        device_hardware_id: 'hardware-1',
      });

      expect(findFirstSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [{ is_active: null }, { is_active: true }],
          }),
        }),
      );
      expect(createSpy).toHaveBeenCalled();
      expect(response).toBe(mockSchoolDto[0].user_id);
    });

    it('should not deduplicate when the device has no usable hardware id', async () => {
      // sanitizeHardwareId() nulls out the generic ids shared by hundreds of
      // machines; without a hardware id the device cannot be identified, so a
      // new row is the only safe answer.
      const findFirstSpy = jest.spyOn(prisma.dailycheckapp_school, 'findFirst');
      jest
        .spyOn(prisma.dailycheckapp_school, 'create')
        .mockResolvedValue(mockSchoolModel[0]);

      const response = await service.createSchool({
        ...mockSchoolDto[0],
        device_hardware_id: null,
      });

      expect(response).toBe(mockSchoolDto[0].user_id);
      expect(findFirstSpy).not.toHaveBeenCalled();
    });
  });
});
