import { Test, TestingModule } from '@nestjs/testing';
import { SchoolMasterService } from './school-master.service';
import { PrismaService } from '../prisma/prisma.service';
import { mockSchoolDto, mockSchoolModel } from '../common/mock-objects';

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

  describe('Schools', () => {
    it('should return schools', async () => {
      jest
        .spyOn(prisma.dailycheckapp_school, 'findMany')
        .mockResolvedValue(mockSchoolModel);

      expect(await service.schools()).toEqual(mockSchoolDto);
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

  describe('SchoolsById', () => {
    it('should return schools', async () => {
      jest
        .spyOn(prisma.dailycheckapp_school, 'findMany')
        .mockResolvedValue(mockSchoolModel);

      const schools = await service.schoolsById('1');
      expect(schools).toEqual(mockSchoolDto);
    });

    it('should handle empty result set', async () => {
      jest.spyOn(prisma.dailycheckapp_school, 'findMany').mockResolvedValue([]);

      const schools = await service.schoolsById('4');
      expect(schools).toEqual([]);
    });

    it('should handle database error', async () => {
      jest
        .spyOn(prisma.dailycheckapp_school, 'findMany')
        .mockRejectedValue(new Error('Database error'));

      await expect(service.schoolsById('0')).rejects.toThrow('Database error');
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
  });
});
