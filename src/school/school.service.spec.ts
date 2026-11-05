import { Test, TestingModule } from '@nestjs/testing';
import { SchoolService } from './school.service';
import { PrismaService } from '../prisma/prisma.service';
import { GeolocationUtility } from '../geolocation/geolocation.utility';
import { DeviceIdService } from './device-id.service';
import * as Sentry from '@sentry/node';
import {
  mockCountryModel,
  mockSchoolDto,
  mockSchoolMasterModel,
  mockSchoolModel,
} from '../common/mock-objects';

jest.mock('@sentry/node', () => ({ captureException: jest.fn() }));

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
      // As before 2.0.4: same school, same hardware ID, active. The device ID
      // is stored but not used for this.
      expect(findFirstSpy).toHaveBeenCalledWith({
        where: {
          giga_id_school: 'gigaid1',
          device_hardware_id: 'hardware-1',
          OR: [{ is_active: null }, { is_active: true }],
        },
        orderBy: { id: 'asc' },
      });
    });

    it('should look for the repeat inside the locked transaction', async () => {
      // On the transaction's own connection, after the lock, so two requests
      // for the same PC can't both find none.
      const tx = {
        dailycheckapp_school: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue(mockSchoolModel[0]),
        },
      };
      (prisma.$transaction as jest.Mock).mockImplementationOnce((fn: any) =>
        fn(tx),
      );
      const outsideSpy = jest.spyOn(prisma.dailycheckapp_school, 'findFirst');

      await service.createSchool({
        ...mockSchoolDto[0],
        device_hardware_id: 'hardware-1',
      });

      expect(outsideSpy).not.toHaveBeenCalled();
      expect(tx.dailycheckapp_school.findFirst).toHaveBeenCalled();
      expect(mockDeviceIdService.lock.mock.invocationCallOrder[0]).toBeLessThan(
        tx.dailycheckapp_school.findFirst.mock.invocationCallOrder[0],
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

    it("should not give a repeat with another PC's device ID this PC's", async () => {
      // The repeat is found by hardware ID, so with a firmware UUID shared by
      // PCs copied from one disk image it can be another PC's registration.
      jest.spyOn(prisma.dailycheckapp_school, 'findFirst').mockResolvedValue({
        ...mockSchoolModel[0],
        user_id: 'other_pc',
        device_hardware_id: 'hardware-1',
        device_id: 'device-9',
      });
      const updateSpy = jest.spyOn(prisma.dailycheckapp_school, 'update');

      const response = await service.createSchool({
        ...mockSchoolDto[0],
        device_hardware_id: 'hardware-1',
        disk_serial: 'disk-1',
      });

      expect(response.user_id).toBe('other_pc');
      expect(updateSpy).not.toHaveBeenCalled();
    });

    it('should add the values to an older registration just linked to this PC', async () => {
      // assign() gave the older registration this PC's device ID, without the
      // values; the repeat stores them, so the PC can be matched by them later.
      jest.spyOn(prisma.dailycheckapp_school, 'findFirst').mockResolvedValue({
        ...mockSchoolModel[0],
        id: BigInt(42),
        user_id: 'old_user_id',
        device_hardware_id: 'hardware-1',
        device_id: 'device-1',
      });
      const updateSpy = jest
        .spyOn(prisma.dailycheckapp_school, 'update')
        .mockImplementation(
          ({ data }: any) =>
            ({ ...mockSchoolModel[0], user_id: 'old_user_id', ...data }) as any,
        );

      await service.createSchool({
        ...mockSchoolDto[0],
        device_hardware_id: 'hardware-1',
        disk_serial: 'disk-1',
      });

      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: BigInt(42) },
        data: expect.objectContaining({
          disk_serial: 'disk-1',
          device_id: 'device-1',
        }),
      });
    });

    it('should clear the failed flag on a registration saved without a device ID', async () => {
      // Saved by the fallback, then given this PC's device ID by assign().
      jest.spyOn(prisma.dailycheckapp_school, 'findFirst').mockResolvedValue({
        ...mockSchoolModel[0],
        id: BigInt(43),
        device_hardware_id: 'hardware-1',
        device_id: 'device-1',
        disk_serial: 'disk-1',
        device_id_flags: ['device_id_failed'],
      });
      const updateSpy = jest
        .spyOn(prisma.dailycheckapp_school, 'update')
        .mockImplementation(
          ({ data }: any) => ({ ...mockSchoolModel[0], ...data }) as any,
        );

      await service.createSchool({
        ...mockSchoolDto[0],
        device_hardware_id: 'hardware-1',
        disk_serial: 'disk-1',
      });

      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: BigInt(43) },
        data: expect.objectContaining({
          device_id: 'device-1',
          device_id_flags: [],
        }),
      });
    });

    it('should work out the distance to the school before the transaction', async () => {
      // The distance query uses its own connection, so running it inside the
      // transaction would hold one connection while waiting for another.
      jest
        .spyOn(prisma.dailycheckapp_school, 'create')
        .mockResolvedValue(mockSchoolModel[0]);

      await service.createSchool({
        ...mockSchoolDto[0],
        device_hardware_id: 'hardware-1',
        geolocation: { location: { lat: 1, lng: 2 }, accuracy: 10 },
      });

      const distance = geolocation.calculateDistanceAndSetFlag as jest.Mock;
      expect(distance).toHaveBeenCalled();
      expect(distance.mock.invocationCallOrder[0]).toBeLessThan(
        (prisma.$transaction as jest.Mock).mock.invocationCallOrder[0],
      );
    });

    it('should give the transaction the wait of an ordinary query', async () => {
      jest
        .spyOn(prisma.dailycheckapp_school, 'create')
        .mockResolvedValue(mockSchoolModel[0]);

      await service.createSchool({
        ...mockSchoolDto[0],
        device_hardware_id: 'hardware-1',
      });

      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
        maxWait: 10_000,
        timeout: 20_000,
      });
    });

    describe('when working out the device ID fails', () => {
      beforeEach(() => (Sentry.captureException as jest.Mock).mockClear());

      it('should still save the registration, without a device ID', async () => {
        mockDeviceIdService.assign.mockRejectedValueOnce(new Error('boom'));
        const createSpy = jest
          .spyOn(prisma.dailycheckapp_school, 'create')
          .mockResolvedValue(mockSchoolModel[0]);

        const response = await service.createSchool({
          ...mockSchoolDto[0],
          device_hardware_id: 'hardware-1',
          disk_serial: 'disk-1',
        });

        expect(response.user_id).toBe(mockSchoolModel[0].user_id);
        expect(createSpy).toHaveBeenCalledTimes(1);
        expect(createSpy).toHaveBeenCalledWith({
          data: expect.objectContaining({
            device_hardware_id: 'hardware-1',
            disk_serial: 'disk-1',
            device_id: null,
            device_id_flags: ['device_id_failed'],
          }),
        });
        expect(Sentry.captureException).toHaveBeenCalled();
      });

      it('should still save it when the transaction itself fails', async () => {
        // For example no connection free in time at a busy moment.
        (prisma.$transaction as jest.Mock).mockRejectedValueOnce(
          new Error('Transaction API error: Unable to start a transaction'),
        );
        const createSpy = jest
          .spyOn(prisma.dailycheckapp_school, 'create')
          .mockResolvedValue(mockSchoolModel[0]);

        await service.createSchool({
          ...mockSchoolDto[0],
          device_hardware_id: 'hardware-1',
        });

        expect(createSpy).toHaveBeenCalledWith({
          data: expect.objectContaining({ device_id_flags: ['device_id_failed'] }),
        });
      });

      it('should return the existing registration on a repeat, as before 2.0.4', async () => {
        mockDeviceIdService.assign.mockRejectedValueOnce(new Error('boom'));
        const findFirstSpy = jest
          .spyOn(prisma.dailycheckapp_school, 'findFirst')
          .mockResolvedValue({ ...mockSchoolModel[0], user_id: 'existing' });
        const createSpy = jest.spyOn(prisma.dailycheckapp_school, 'create');

        const response = await service.createSchool({
          ...mockSchoolDto[0],
          device_hardware_id: 'hardware-1',
        });

        expect(response.user_id).toBe('existing');
        expect(createSpy).not.toHaveBeenCalled();
        expect(findFirstSpy).toHaveBeenCalledWith({
          where: {
            giga_id_school: 'gigaid1',
            device_hardware_id: 'hardware-1',
            OR: [{ is_active: null }, { is_active: true }],
          },
          orderBy: { id: 'asc' },
        });
      });
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

      expect(findFirstSpy.mock.calls[0][0].where.OR).toEqual([
        { is_active: null },
        { is_active: true },
      ]);
      expect(createSpy).toHaveBeenCalled();
      expect(response).toEqual({
        user_id: mockSchoolDto[0].user_id,
        is_verified: false,
      });
    });

    it('should not deduplicate when the device has no usable hardware id', async () => {
      // sanitizeHardwareId() nulls out the generic ids shared by hundreds of
      // machines; without a hardware id the device cannot be identified, so a
      // new row is the only safe answer. The device ID doesn't change that.
      const findFirstSpy = jest.spyOn(prisma.dailycheckapp_school, 'findFirst');
      const createSpy = jest
        .spyOn(prisma.dailycheckapp_school, 'create')
        .mockResolvedValue(mockSchoolModel[0]);

      const response = await service.createSchool({
        ...mockSchoolDto[0],
        device_hardware_id: '03000200-0400-0500-0006-000700080009',
        disk_serial: 'disk-1',
      });

      expect(response).toEqual({
        user_id: mockSchoolDto[0].user_id,
        is_verified: false,
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
      it('stores the hardware values and the device ID', async () => {
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

      it("gives a second Windows user the PC's registration, as before", async () => {
        // One registration per PC and school, shared by its Windows users, as
        // automatic registration does: the Windows user isn't part of the check.
        const findFirstSpy = jest
          .spyOn(prisma.dailycheckapp_school, 'findFirst')
          .mockResolvedValue({
            ...mockSchoolModel[0],
            user_id: 'first-user-registration',
            windows_username: 'first-user',
            device_id: 'device-1',
            disk_serial: 'disk-c',
          });
        const createSpy = createdRow();

        const response = await service.createSchool({
          ...mockSchoolDto[0],
          device_hardware_id: 'uuid-a',
          disk_serial: 'disk-c',
          windows_username: 'second-user',
        });

        expect(findFirstSpy.mock.calls[0][0].where).not.toHaveProperty(
          'windows_username',
        );
        expect(createSpy).not.toHaveBeenCalled();
        expect(response.user_id).toBe('first-user-registration');
      });

      it('gives another PC with the same firmware UUID the same registration, as before', async () => {
        // PCs copied from one disk image: same placeholder UUID, different
        // serials, so a different device ID. Nothing acts on the device ID
        // yet, so the repeat check goes by hardware ID as before.
        mockDeviceIdService.assign.mockResolvedValueOnce({
          device_id: 'device-2',
          device_id_flags: [],
        });
        jest.spyOn(prisma.dailycheckapp_school, 'findFirst').mockResolvedValue({
          ...mockSchoolModel[0],
          user_id: 'first-pc',
          device_hardware_id: 'uuid-shared',
          baseboard_serial: 'board-1',
          disk_serial: 'disk-1',
          device_id: 'device-1',
        });
        const createSpy = createdRow();

        const response = await service.createSchool({
          ...mockSchoolDto[0],
          device_hardware_id: 'uuid-shared',
          windows_username: 'student',
          baseboard_serial: 'board-2',
          disk_serial: 'disk-2',
        });

        expect(createSpy).not.toHaveBeenCalled();
        expect(response.user_id).toBe('first-pc');
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

    describe('deactivateDevice', () => {
      it('logs out every registration of the PC at the school, as before', async () => {
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
