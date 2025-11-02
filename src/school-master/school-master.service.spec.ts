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

      expect(await service.checkSchool('IN', '11')).toEqual([]);
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
