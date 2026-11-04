import { Test, TestingModule } from '@nestjs/testing';
import { SchoolService } from './school.service';
import { PrismaService } from '../prisma/prisma.service';
import { GeolocationUtility } from '../geolocation/geolocation.utility';
import { DeviceIdService } from './device-id.service';
import {
  mockCountryModel,
  mockSchoolDto,
  mockSchoolMasterModel,
  mockSchoolModel,
} from '../common/mock-objects';

describe('SchoolService', () => {
  let service: SchoolService;
  let prisma: PrismaService;
  let geolocation: GeolocationUtility;
  let mockDeviceIdService: { lock: jest.Mock; assign: jest.Mock };

  beforeEach(async () => {
    const mockGeolocationUtility = {
      calculateDistanceAndSetFlag: jest.fn(),
      updateLatLngColumns: jest.fn(),
      getSchoolCoordinates: jest.fn(),
      calculateDistance: jest.fn(),
    };

    mockDeviceIdService = {
      lock: jest.fn().mockResolvedValue(undefined),
      assign: jest
        .fn()
        .mockResolvedValue({ device_id: 'device-1', device_id_flags: [] }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchoolService, 
        PrismaService,
        {
          provide: GeolocationUtility,
          useValue: mockGeolocationUtility,
        },
        { provide: DeviceIdService, useValue: mockDeviceIdService },
      ],
    }).compile();

    service = module.get<SchoolService>(SchoolService);
    prisma = module.get<PrismaService>(PrismaService);
    geolocation = module.get<GeolocationUtility>(GeolocationUtility);

    // The insert runs in a transaction; run it against the mocked client.
    jest
      .spyOn(prisma, '$transaction')
      .mockImplementation((fn: any) => fn(prisma));
    jest.spyOn(prisma.school, 'findFirst').mockResolvedValue(null);
    jest
      .spyOn(prisma.school_new_registration, 'findFirst')
      .mockResolvedValue(null);
    // No registration found unless a test says otherwise.
    jest.spyOn(prisma.dailycheckapp_school, 'findFirst').mockResolvedValue(null);
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
      expect(countryId).toEqual({
        user_id: mockSchoolDto[0].user_id,
        is_verified: false,
      });
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
        device_id: 'device-1',
        disk_serial: 'disk-1',
      };
      const findFirstSpy = jest
        .spyOn(prisma.dailycheckapp_school, 'findFirst')
        .mockResolvedValue(existing);
      const createSpy = jest.spyOn(prisma.dailycheckapp_school, 'create');

      const response = await service.createSchool({
        ...mockSchoolDto[0],
        device_hardware_id: 'hardware-1',
      });

      expect(response).toEqual({
        user_id: 'existing_user_id',
        is_verified: false,
      });
      expect(createSpy).not.toHaveBeenCalled();
      // Same school, same Windows user, active, and this PC: its device ID,
      // or its firmware UUID on a registration from before 2.0.4.
      expect(findFirstSpy).toHaveBeenCalledWith({
        where: {
          giga_id_school: 'gigaid1',
          windows_username: null,
          AND: [
            { OR: [{ is_active: null }, { is_active: true }] },
            {
              OR: [
                { device_id: 'device-1' },
                { device_id: null, device_hardware_id: 'hardware-1' },
              ],
            },
          ],
        },
        orderBy: { id: 'asc' },
      });
    });

    it('should look for the repeat inside the locked transaction', async () => {
      const findFirstSpy = jest.spyOn(prisma.dailycheckapp_school, 'findFirst');
      jest
        .spyOn(prisma.dailycheckapp_school, 'create')
        .mockResolvedValue(mockSchoolModel[0]);

      await service.createSchool({
        ...mockSchoolDto[0],
        device_hardware_id: 'hardware-1',
      });

      expect(mockDeviceIdService.lock.mock.invocationCallOrder[0]).toBeLessThan(
        findFirstSpy.mock.invocationCallOrder[0],
      );
    });

    it('should fill in a registration from before 2.0.4 on a repeat', async () => {
      // The PC registered on an older app; 2.0.4 sends its values now.
      jest.spyOn(prisma.dailycheckapp_school, 'findFirst').mockResolvedValue({
        ...mockSchoolModel[0],
        id: BigInt(41),
        user_id: 'old_user_id',
        device_hardware_id: 'hardware-1',
        device_id: null,
      });
      const updateSpy = jest
        .spyOn(prisma.dailycheckapp_school, 'update')
        .mockImplementation(
          ({ data }: any) =>
            ({ ...mockSchoolModel[0], user_id: 'old_user_id', ...data }) as any,
        );
      const createSpy = jest.spyOn(prisma.dailycheckapp_school, 'create');

      const response = await service.createSchool({
        ...mockSchoolDto[0],
        device_hardware_id: 'hardware-1',
        baseboard_serial: 'board-1',
        disk_serial: 'disk-1',
        machine_guid: 'guid-1',
      });

      expect(response.user_id).toBe('old_user_id');
      expect(createSpy).not.toHaveBeenCalled();
      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: BigInt(41) },
        data: {
          baseboard_serial: 'board-1',
          disk_serial: 'disk-1',
          machine_guid: 'guid-1',
          device_id: 'device-1',
          device_id_flags: [],
        },
      });
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
        device_id: 'device-1',
        disk_serial: 'disk-1',
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
        device_id: 'device-1',
        disk_serial: 'disk-1',
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
      const findFirstSpy = jest.spyOn(prisma.dailycheckapp_school, 'findFirst');
      const createSpy = jest
        .spyOn(prisma.dailycheckapp_school, 'create')
        .mockResolvedValue(mockSchoolModel[0]);

      const response = await service.createSchool({
        ...mockSchoolDto[0],
        device_hardware_id: 'hardware-1',
      });

      expect(findFirstSpy.mock.calls[0][0].where.AND[0]).toEqual({
        OR: [{ is_active: null }, { is_active: true }],
      });
      expect(createSpy).toHaveBeenCalled();
      expect(response).toEqual({
        user_id: mockSchoolDto[0].user_id,
        is_verified: false,
      });
    });

    it('should match a repeat by device ID alone when there is no usable hardware id', async () => {
      // sanitizeHardwareId() nulls out the generic ids shared by hundreds of
      // machines, so without one only the device ID can say it's the same PC.
      // A PC with no values at all gets a new device ID every time, so it is
      // never a repeat.
      const findFirstSpy = jest.spyOn(prisma.dailycheckapp_school, 'findFirst');
      jest
        .spyOn(prisma.dailycheckapp_school, 'create')
        .mockResolvedValue(mockSchoolModel[0]);

      const response = await service.createSchool({
        ...mockSchoolDto[0],
        device_hardware_id: '03000200-0400-0500-0006-000700080009',
      });

      expect(response).toEqual({
        user_id: mockSchoolDto[0].user_id,
        is_verified: false,
      });
      expect(findFirstSpy.mock.calls[0][0].where.AND[1]).toEqual({
        OR: [{ device_id: 'device-1' }],
      });
    });

    it('should never treat a PC it cannot recognise as a repeat', async () => {
      // No device ID (nothing usable) and no usable firmware UUID: matching on
      // "no device ID" would pick up other PCs' registrations with the same
      // Windows account name, so there is no repeat lookup at all.
      mockDeviceIdService.assign.mockResolvedValueOnce({
        device_id: null,
        device_id_flags: ['nothing_readable'],
      });
      const findFirstSpy = jest.spyOn(prisma.dailycheckapp_school, 'findFirst');
      const createSpy = jest
        .spyOn(prisma.dailycheckapp_school, 'create')
        .mockResolvedValue(mockSchoolModel[0]);

      await service.createSchool({
        ...mockSchoolDto[0],
        device_hardware_id: '03000200-0400-0500-0006-000700080009',
      });

      expect(findFirstSpy).not.toHaveBeenCalled();
      expect(createSpy).toHaveBeenCalled();
    });
  });

  describe('ResolveIsVerified', () => {
    it('should return true when school exists and not_verified is false', async () => {
      jest.spyOn(prisma.school, 'findFirst').mockResolvedValue({
        ...mockSchoolMasterModel,
        not_verified: false,
      });

      await expect(service.resolveIsVerified('gigaid1')).resolves.toBe(true);
    });

    it('should return true when school exists and not_verified is null', async () => {
      jest.spyOn(prisma.school, 'findFirst').mockResolvedValue({
        ...mockSchoolMasterModel,
        not_verified: null,
      });

      await expect(service.resolveIsVerified('gigaid1')).resolves.toBe(true);
    });

    it('should return false when school exists and not_verified is true', async () => {
      jest.spyOn(prisma.school, 'findFirst').mockResolvedValue({
        ...mockSchoolMasterModel,
        not_verified: true,
      });

      await expect(service.resolveIsVerified('gigaid1')).resolves.toBe(false);
    });

    it('should return false when only an active registration exists', async () => {
      jest
        .spyOn(prisma.school_new_registration, 'findFirst')
        .mockResolvedValue({
          id: BigInt(10),
        } as any);

      await expect(service.resolveIsVerified('gigaid1')).resolves.toBe(false);
    });

    it('should return false when no school or registration exists', async () => {
      await expect(service.resolveIsVerified('gigaid1')).resolves.toBe(false);
    });
  });

  describe('CheckExistingInstallation', () => {
    it('should include is_verified in existing installation response', async () => {
      jest.spyOn(prisma.dailycheckapp_school, 'findFirst').mockResolvedValue({
        ...mockSchoolModel[0],
        device_hardware_id: 'device-1',
      } as any);
      jest.spyOn(prisma.school, 'findFirst').mockResolvedValue({
        ...mockSchoolMasterModel,
        external_id: 'school-ext-1',
        not_verified: false,
      } as any);

      const result = await service.checkExistingInstallation('device-1');

      expect(result).toMatchObject({
        exists: true,
        user_id: mockSchoolModel[0].user_id,
        giga_id_school: mockSchoolModel[0].giga_id_school,
      });
    });
  });
  describe('Device ID (TECH-8828)', () => {
    const createdRow = () =>
      jest
        .spyOn(prisma.dailycheckapp_school, 'create')
        .mockImplementation(
          ({ data }: any) => ({ ...mockSchoolModel[0], ...data }) as any,
        );

    describe('createSchool', () => {
      it('stores the hardware values, the device ID and the registration type', async () => {
        const createSpy = createdRow();

        await service.createSchool({
          ...mockSchoolDto[0],
          device_hardware_id: 'uuid-a',
          baseboard_serial: 'board-b',
          disk_serial: 'disk-c',
          machine_guid: 'guid-m',
        });

        const signals = {
          firmware_uuid: 'uuid-a',
          baseboard_serial: 'board-b',
          disk_serial: 'disk-c',
          machine_guid: 'guid-m',
        };
        expect(mockDeviceIdService.lock).toHaveBeenCalledWith(prisma, signals);
        expect(mockDeviceIdService.assign).toHaveBeenCalledWith(prisma, signals);
        expect(createSpy).toHaveBeenCalledWith({
          data: expect.objectContaining({
            device_hardware_id: 'uuid-a',
            baseboard_serial: 'board-b',
            disk_serial: 'disk-c',
            machine_guid: 'guid-m',
            device_id: 'device-1',
            device_id_flags: [],
            registration_type: 'manual',
          }),
        });
      });

      it('stores placeholder serials as missing', async () => {
        const createSpy = createdRow();

        await service.createSchool({
          ...mockSchoolDto[0],
          device_hardware_id: 'uuid-a',
          baseboard_serial: 'Default string',
          disk_serial: '  ',
        });

        expect(createSpy).toHaveBeenCalledWith({
          data: expect.objectContaining({
            baseboard_serial: null,
            disk_serial: null,
            machine_guid: null,
          }),
        });
      });

      it('registers a second Windows user on the same PC separately', async () => {
        // The repeat-submission check is per Windows user, so another user's
        // active registration for this school isn't returned.
        const findFirstSpy = jest.spyOn(
          prisma.dailycheckapp_school,
          'findFirst',
        );
        const createSpy = createdRow();

        await service.createSchool({
          ...mockSchoolDto[0],
          device_hardware_id: 'uuid-a',
          windows_username: 'second-user',
        });

        expect(findFirstSpy.mock.calls[0][0].where.windows_username).toBe(
          'second-user',
        );
        expect(createSpy).toHaveBeenCalled();
      });

      it('treats another PC with the same firmware UUID and account name as a new registration', async () => {
        // PCs copied from one disk image: same placeholder UUID, same Windows
        // account name, different serials, so a different device ID. The
        // repeat must have this PC's device ID; the real-database run checks
        // the other PC's row isn't returned.
        mockDeviceIdService.assign.mockResolvedValueOnce({
          device_id: 'device-2',
          device_id_flags: [],
        });
        const findFirstSpy = jest.spyOn(
          prisma.dailycheckapp_school,
          'findFirst',
        );
        const createSpy = createdRow();

        await service.createSchool({
          ...mockSchoolDto[0],
          device_hardware_id: 'uuid-shared',
          windows_username: 'student',
          baseboard_serial: 'board-2',
          disk_serial: 'disk-2',
        });

        expect(findFirstSpy.mock.calls[0][0].where.AND[1]).toEqual({
          OR: [
            { device_id: 'device-2' },
            { device_id: null, device_hardware_id: 'uuid-shared' },
          ],
        });
        expect(createSpy).toHaveBeenCalledWith({
          data: expect.objectContaining({ device_id: 'device-2' }),
        });
      });

      it('still absorbs a repeat from the same machine', async () => {
        jest.spyOn(prisma.dailycheckapp_school, 'findFirst').mockResolvedValue({
          ...mockSchoolModel[0],
          user_id: 'this-pc',
          device_hardware_id: 'uuid-shared',
          windows_username: 'student',
          baseboard_serial: 'board-1',
          disk_serial: 'disk-1',
          device_id: 'device-1',
        });
        const createSpy = createdRow();

        const response = await service.createSchool({
          ...mockSchoolDto[0],
          device_hardware_id: 'uuid-shared',
          windows_username: 'student',
          baseboard_serial: 'board-1',
          disk_serial: 'disk-1',
        });

        expect(createSpy).not.toHaveBeenCalled();
        expect(response.user_id).toBe('this-pc');
      });
    });

    describe('autoRegister', () => {
      const source = {
        ...mockSchoolModel[0],
        user_id: 'first-user-registration',
        giga_id_school: 'gigaid1',
        country_code: 'MZ',
        device_hardware_id: 'uuid-a',
        windows_username: 'first-user',
      };
      const request = {
        device_hardware_id: 'uuid-a',
        baseboard_serial: 'board-b',
        disk_serial: 'disk-c',
        machine_guid: 'guid-m',
        windows_username: 'second-user',
        app_version: '2.0.4',
        os: 'windows',
      };

      it('adds a registration of its own for the same school', async () => {
        jest
          .spyOn(prisma.dailycheckapp_school, 'findFirst')
          .mockResolvedValueOnce(source) // the PC's latest active registration
          .mockResolvedValueOnce(null); // nothing for this Windows user yet
        const createSpy = createdRow();

        const result = await service.autoRegister(request);

        const data = createSpy.mock.calls[0][0].data as any;
        expect(data).toEqual(
          expect.objectContaining({
            giga_id_school: 'gigaid1',
            country_code: 'MZ',
            device_hardware_id: 'uuid-a',
            windows_username: 'second-user',
            app_version: '2.0.4',
            registration_type: 'auto',
            baseboard_serial: 'board-b',
            disk_serial: 'disk-c',
            machine_guid: 'guid-m',
            device_id: 'device-1',
          }),
        );
        expect(data.user_id).toMatch(/^[0-9a-f-]{36}$/);
        expect(data.user_id).not.toBe('first-user-registration');
        expect(result).toEqual(
          expect.objectContaining({
            exists: true,
            user_id: data.user_id,
            giga_id_school: 'gigaid1',
            source: 'auto_registration',
          }),
        );
      });

      it('finds the school from the latest active registration', async () => {
        const findFirstSpy = jest
          .spyOn(prisma.dailycheckapp_school, 'findFirst')
          .mockResolvedValueOnce(source);
        createdRow();

        await service.autoRegister(request);

        expect(findFirstSpy.mock.calls[0][0]).toEqual({
          where: {
            device_hardware_id: 'uuid-a',
            OR: [{ is_active: null }, { is_active: true }],
          },
          orderBy: { id: 'desc' },
        });
      });

      it('registers a Windows user again once someone registered the PC again after a logout', async () => {
        // Logging out logs out every registration on the PC. When someone
        // registers it again, the others' logged-out registrations are skipped
        // and each Windows user gets a new one, as before.
        const findFirstSpy = jest
          .spyOn(prisma.dailycheckapp_school, 'findFirst')
          .mockResolvedValueOnce(source) // the new registration after the logout
          .mockResolvedValueOnce(null); // no active one for this Windows user
        const createSpy = createdRow();

        const result = await service.autoRegister(request);

        expect(findFirstSpy.mock.calls[1][0].where.AND[0]).toEqual({
          OR: [{ is_active: null }, { is_active: true }],
        });
        expect(createSpy).toHaveBeenCalled();
        expect(result).toEqual(
          expect.objectContaining({ exists: true, source: 'auto_registration' }),
        );
      });

      it("gives a Windows user their active registration back instead of a new one", async () => {
        const findFirstSpy = jest
          .spyOn(prisma.dailycheckapp_school, 'findFirst')
          .mockResolvedValueOnce(source)
          .mockResolvedValueOnce({
            ...source,
            user_id: 'second-user-registration',
            windows_username: 'second-user',
            is_active: null,
            device_id: 'device-1',
            disk_serial: 'disk-c',
          });
        const createSpy = createdRow();
        const updateSpy = jest.spyOn(prisma.dailycheckapp_school, 'update');

        const result = await service.autoRegister(request);

        expect(createSpy).not.toHaveBeenCalled();
        expect(updateSpy).not.toHaveBeenCalled();
        expect(result.user_id).toBe('second-user-registration');
        // This Windows user on this PC: its device ID, or its firmware UUID
        // on a registration from before 2.0.4. Looked up under the lock.
        expect(findFirstSpy.mock.calls[1][0]).toEqual({
          where: {
            windows_username: 'second-user',
            AND: [
              { OR: [{ is_active: null }, { is_active: true }] },
              {
                OR: [
                  { device_id: 'device-1' },
                  { device_id: null, device_hardware_id: 'uuid-a' },
                ],
              },
            ],
          },
          orderBy: { id: 'desc' },
        });
        expect(mockDeviceIdService.lock.mock.invocationCallOrder[0]).toBeLessThan(
          findFirstSpy.mock.invocationCallOrder[1],
        );
      });

      it('fills in a registration from before 2.0.4 that the user gets back', async () => {
        jest
          .spyOn(prisma.dailycheckapp_school, 'findFirst')
          .mockResolvedValueOnce(source)
          .mockResolvedValueOnce({
            ...source,
            id: BigInt(77),
            user_id: 'second-user-registration',
            windows_username: 'second-user',
            is_active: true,
            device_id: null,
          });
        const updateSpy = jest
          .spyOn(prisma.dailycheckapp_school, 'update')
          .mockImplementation(
            ({ data }: any) =>
              ({
                ...source,
                user_id: 'second-user-registration',
                ...data,
              }) as any,
          );

        const result = await service.autoRegister(request);

        expect(result.user_id).toBe('second-user-registration');
        expect(updateSpy).toHaveBeenCalledWith({
          where: { id: BigInt(77) },
          data: {
            baseboard_serial: 'board-b',
            disk_serial: 'disk-c',
            machine_guid: 'guid-m',
            device_id: 'device-1',
            device_id_flags: [],
          },
        });
      });

      it('returns exists false when the PC has no active registration', async () => {
        jest.spyOn(prisma.dailycheckapp_school, 'findFirst').mockResolvedValue(null);
        jest.spyOn(prisma.measurements, 'findFirst').mockResolvedValue(null);
        const createSpy = createdRow();

        expect(await service.autoRegister(request)).toEqual({ exists: false });
        expect(createSpy).not.toHaveBeenCalled();
      });

      it('returns exists false for a blocked generic firmware UUID', async () => {
        const findFirstSpy = jest.spyOn(prisma.dailycheckapp_school, 'findFirst');

        expect(
          await service.autoRegister({
            ...request,
            device_hardware_id: '03000200-0400-0500-0006-000700080009',
          }),
        ).toEqual({ exists: false });
        expect(findFirstSpy).not.toHaveBeenCalled();
      });
    });

    describe('checkRegistrationStatus', () => {
      it('is active while the registration is', async () => {
        jest
          .spyOn(prisma.dailycheckapp_school, 'findFirst')
          .mockResolvedValue({ ...mockSchoolModel[0], is_active: null });

        expect(await service.checkRegistrationStatus('test_id1')).toEqual({
          is_active: true,
          message: 'Registration is active',
          exists: true,
        });
      });

      it('is inactive once the registration was logged out', async () => {
        jest
          .spyOn(prisma.dailycheckapp_school, 'findFirst')
          .mockResolvedValue({ ...mockSchoolModel[0], is_active: false });

        expect(await service.checkRegistrationStatus('test_id1')).toEqual({
          is_active: false,
          message: 'Registration has been deactivated',
          exists: true,
        });
      });

      it('treats an unknown registration as not deactivated', async () => {
        jest.spyOn(prisma.dailycheckapp_school, 'findFirst').mockResolvedValue(null);

        expect(await service.checkRegistrationStatus('unknown')).toEqual({
          is_active: true,
          message: 'Registration not found',
          exists: false,
        });
      });
    });

    describe('deactivateDevice', () => {
      it('with a user_id, logs out only that registration', async () => {
        const updateSpy = jest
          .spyOn(prisma.dailycheckapp_school, 'updateMany')
          .mockResolvedValue({ count: 1 });

        const result = await service.deactivateDevice(
          'uuid-a',
          ' GIGAID1 ',
          'second-user-registration',
        );

        expect(updateSpy).toHaveBeenCalledWith({
          where: {
            user_id: 'second-user-registration',
            giga_id_school: 'gigaid1',
            OR: [{ is_active: null }, { is_active: true }],
          },
          data: { is_active: false },
        });
        expect(result.deactivated).toBe(true);
      });

      it('without a user_id, logs out by hardware ID as before', async () => {
        const updateSpy = jest
          .spyOn(prisma.dailycheckapp_school, 'updateMany')
          .mockResolvedValue({ count: 2 });

        await service.deactivateDevice('uuid-a', 'gigaid1');

        expect(updateSpy).toHaveBeenCalledWith({
          where: {
            device_hardware_id: 'uuid-a',
            giga_id_school: 'gigaid1',
            OR: [{ is_active: null }, { is_active: true }],
          },
          data: { is_active: false },
        });
      });
    });
  });
});
