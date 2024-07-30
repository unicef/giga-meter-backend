import { Test, TestingModule } from '@nestjs/testing';
import { FlaggedSchoolService } from './flagged-school.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  mockFlaggedSchoolDto,
  mockFlaggedSchoolModel,
} from '../common/mock-objects';

describe('FlaggedSchoolService', () => {
  let service: FlaggedSchoolService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FlaggedSchoolService, PrismaService],
    }).compile();

    service = module.get<FlaggedSchoolService>(FlaggedSchoolService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Schools', () => {
    it('should return schools', async () => {
      jest
        .spyOn(prisma.dailycheckapp_flagged_school, 'findMany')
        .mockResolvedValue(mockFlaggedSchoolModel);

      const schools = await service.schools({});
      expect(schools).toEqual(mockFlaggedSchoolDto);
    });

    it('should handle empty result set', async () => {
      jest
        .spyOn(prisma.dailycheckapp_flagged_school, 'findMany')
        .mockResolvedValue([]);

      const schools = await service.schools({});
      expect(schools).toEqual([]);
    });

    it('should handle database error', async () => {
      jest
        .spyOn(prisma.dailycheckapp_flagged_school, 'findMany')
        .mockRejectedValue(new Error('Database error'));

      await expect(service.schools({})).rejects.toThrow('Database error');
    });
  });

  describe('SchoolsByCountryId', () => {
    it('should return schools', async () => {
      jest
        .spyOn(prisma.dailycheckapp_flagged_school, 'findMany')
        .mockResolvedValue(mockFlaggedSchoolModel);

      const schools = await service.schoolsByCountryId('IN');
      expect(schools).toEqual(mockFlaggedSchoolDto);
    });

    it('should handle empty result set', async () => {
      jest
        .spyOn(prisma.dailycheckapp_flagged_school, 'findMany')
        .mockResolvedValue([]);

      const schools = await service.schoolsByCountryId('TT');
      expect(schools).toEqual([]);
    });

    it('should handle database error', async () => {
      jest
        .spyOn(prisma.dailycheckapp_flagged_school, 'findMany')
        .mockRejectedValue(new Error('Database error'));

      await expect(service.schoolsByCountryId('IN')).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('CreateSchool', () => {
    it('should create country', async () => {
      jest
        .spyOn(prisma.dailycheckapp_flagged_school, 'create')
        .mockResolvedValue(mockFlaggedSchoolModel[0]);

      const countryId = await service.createSchool(mockFlaggedSchoolDto[0]);
      expect(countryId).toEqual(mockFlaggedSchoolDto[0].id);
    });

    it('should handle database error', async () => {
      jest
        .spyOn(prisma.dailycheckapp_flagged_school, 'create')
        .mockRejectedValue(new Error('Database error'));

      await expect(
        service.createSchool(mockFlaggedSchoolDto[0]),
      ).rejects.toThrow('Database error');
    });
  });
});
