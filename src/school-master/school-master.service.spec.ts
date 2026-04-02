import { Test, TestingModule } from '@nestjs/testing';
import { SchoolMasterService } from './school-master.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  mockFeatureFlagsDto,
  mockSchoolMasterDto,
  mockSchoolMasterModel,
} from '../common/mock-objects';

describe('SchoolMasterService', () => {
  let service: SchoolMasterService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SchoolMasterService, PrismaService],
    }).compile();

    service = module.get<SchoolMasterService>(SchoolMasterService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkSchool', () => {
    it('should check school', async () => {
      jest
        .spyOn(prisma.school, 'findMany')
        .mockResolvedValue([mockSchoolMasterModel]);

      expect(await service.checkSchool('IN', '11')).toEqual(
        mockSchoolMasterDto,
      );
    });

    it('should handle false response', async () => {
      jest.spyOn(prisma.school, 'findMany').mockResolvedValue([]);
      jest
        .spyOn(prisma.school_new_registration, 'findFirst')
        .mockResolvedValue(null);

      expect(await service.checkSchool('IN', '11')).toEqual([]);
    });

    it('should map school registration to school dto when school is not found', async () => {
      jest.spyOn(prisma.school, 'findMany').mockResolvedValue([]);
      jest
        .spyOn(prisma.school_new_registration, 'findFirst')
        .mockResolvedValue({
          id: BigInt(12),
          school_id: '11',
          school_name: 'registration-school',
          latitude: 12.9,
          longitude: 77.5,
          address: {
            address: 'Delhi address',
            state: 'Delhi',
            city: 'New Delhi',
            postalCode: '110001',
          },
          education_level: 'Primary',
          contact_name: 'Jane',
          contact_email: 'jane@example.com',
          giga_id_school: 'registration-giga-id',
          verification_status: 'DISPATCHED',
          verification_requested_at: null,
          verification_error: null,
          created: new Date('2026-03-31T00:00:00.000Z'),
          modified: new Date('2026-03-31T00:00:00.000Z'),
          created_at: new Date('2026-03-31T00:00:00.000Z'),
          deleted: null,
        } as any);

      await expect(service.checkSchool('IN', '11')).resolves.toEqual([
        {
          id: 12,
          school_id: '11',
          code: '',
          name: 'registration-school',
          country_id: null,
          country: 'IN',
          location_id: null,
          address: 'Delhi address',
          email: 'jane@example.com',
          postal_code: '110001',
          education_level: 'Primary',
          environment: null,
          admin_1_name: 'Delhi',
          admin_2_name: 'New Delhi',
          admin_3_name: null,
          admin_4_name: null,
          giga_id_school: 'registration-giga-id',
          is_verified: false,
        },
      ]);
    });

    it('should handle database error', async () => {
      jest
        .spyOn(prisma.school, 'findMany')
        .mockRejectedValue(new Error('Database error'));

      await expect(service.checkSchool('IN', '11')).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('flagsByGigaId', () => {
    it('should return flags', async () => {
      jest
        .spyOn(prisma.school, 'findFirstOrThrow')
        .mockResolvedValue(mockSchoolMasterModel);

      const flags = await service.flagsByGigaId('gigaid1');
      expect(flags).toEqual(mockFeatureFlagsDto);
    });

    it('should default pingService to true when not present in DB', async () => {
      const modelWithoutPingService = {
        ...mockSchoolMasterModel,
        feature_flags: {
          feature_flag: true,
          feature_flag_2: false,
        },
      };
      jest
        .spyOn(prisma.school, 'findFirstOrThrow')
        .mockResolvedValue(modelWithoutPingService);

      const flags = await service.flagsByGigaId('gigaid1');
      expect(flags.pingService).toBe(true);
    });

    it('should keep pingService as false when explicitly set to false in DB', async () => {
      const modelWithPingServiceFalse = {
        ...mockSchoolMasterModel,
        feature_flags: {
          feature_flag: true,
          feature_flag_2: false,
          pingService: false,
        },
      };
      jest
        .spyOn(prisma.school, 'findFirstOrThrow')
        .mockResolvedValue(modelWithPingServiceFalse);

      const flags = await service.flagsByGigaId('gigaid1');
      expect(flags.pingService).toBe(false);
    });

    it('should keep pingService as true when already set to true in DB', async () => {
      jest
        .spyOn(prisma.school, 'findFirstOrThrow')
        .mockResolvedValue(mockSchoolMasterModel);

      const flags = await service.flagsByGigaId('gigaid1');
      expect(flags.pingService).toBe(true);
    });

    it('should return default flags with pingService true when feature_flags is null', async () => {
      const modelWithNullFlags = {
        ...mockSchoolMasterModel,
        feature_flags: null,
      };
      jest
        .spyOn(prisma.school, 'findFirstOrThrow')
        .mockResolvedValue(modelWithNullFlags);

      const flags = await service.flagsByGigaId('gigaid1');
      expect(flags).toBeDefined();
      expect(flags.pingService).toBe(true);
    });

    it('should handle null school', async () => {
      jest.spyOn(prisma.school, 'findFirstOrThrow').mockResolvedValue(null);

      const flags = await service.flagsByGigaId('gigaid1');
      expect(flags).toBeDefined();
      expect(flags.pingService).toBe(true);
    });

    it('should handle database error', async () => {
      jest
        .spyOn(prisma.school, 'findFirstOrThrow')
        .mockRejectedValue(new Error('Database error'));

      await expect(service.flagsByGigaId('gigaid1')).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('setFlagsByGigaId', () => {
    it('should set flags', async () => {
      jest
        .spyOn(prisma.school, 'findFirstOrThrow')
        .mockResolvedValue(mockSchoolMasterModel);
      jest.spyOn(prisma.school, 'update').mockResolvedValue(null);

      const result = await service.setFlagsByGigaId('11', mockFeatureFlagsDto);
      expect(result).toEqual(true);
    });

    it('should handle database error while finding school', async () => {
      jest
        .spyOn(prisma.school, 'findFirstOrThrow')
        .mockRejectedValue(new Error('Database error'));

      await expect(
        service.setFlagsByGigaId('11', mockFeatureFlagsDto),
      ).rejects.toThrow('Database error');
    });

    it('should handle database error while updating flag', async () => {
      jest
        .spyOn(prisma.school, 'findFirstOrThrow')
        .mockResolvedValue(mockSchoolMasterModel);
      jest
        .spyOn(prisma.school, 'update')
        .mockRejectedValue(new Error('Database error'));

      await expect(
        service.setFlagsByGigaId('11', mockFeatureFlagsDto),
      ).rejects.toThrow('Database error');
    });
  });
});
