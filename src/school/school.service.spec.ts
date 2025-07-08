import { Test, TestingModule } from '@nestjs/testing';
import { SchoolService } from './school.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  mockCountryModel,
  mockSchoolDto,
  mockSchoolModel,
  mockSchoolEmailUpdateDto,
} from '../common/mock-objects';

describe('SchoolService', () => {
  let service: SchoolService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SchoolService, PrismaService],
    }).compile();

    service = module.get<SchoolService>(SchoolService);
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
        .mockResolvedValue(mockSchoolModel[0]);
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
  });

  describe('UpdateSchoolEmail', () => {
    it('should update school email when mac_address and user_id match', async () => {
      jest.spyOn(prisma.dailycheckapp_school, 'findFirst').mockResolvedValue({
        ...mockSchoolModel[0],
        mac_address: mockSchoolEmailUpdateDto.mac_address,
        user_id: mockSchoolEmailUpdateDto.user_id,
        email: []
      });
      jest.spyOn(prisma.dailycheckapp_school, 'update').mockResolvedValue({
        ...mockSchoolModel[0],
        user_id: mockSchoolEmailUpdateDto.user_id,
        email: mockSchoolEmailUpdateDto.email
      });
      const result = await service.updateSchoolEmail(mockSchoolEmailUpdateDto);
      expect(result).toEqual(mockSchoolEmailUpdateDto.user_id);
    });
    it('should throw error if school not found', async () => {
      jest.spyOn(prisma.dailycheckapp_school, 'findFirst').mockResolvedValue(null);
      await expect(service.updateSchoolEmail(mockSchoolEmailUpdateDto)).rejects.toThrow('School not found');
    });
  });
});
