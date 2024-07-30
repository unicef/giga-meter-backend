import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { mockAdminSchoolDto, mockSchoolModel } from '../common/mock-objects';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminService, PrismaService],
    }).compile();

    service = module.get<AdminService>(AdminService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('GetSchools', () => {
    it('should get schools', async () => {
      jest
        .spyOn(prisma.dailycheckapp_school, 'findMany')
        .mockResolvedValue(mockSchoolModel);

      const messages = await service.schools();
      expect(messages).toEqual(mockAdminSchoolDto);
    });

    it('should handle empty result set', async () => {
      jest.spyOn(service, 'schools').mockResolvedValue([]);

      expect(await service.schools()).toStrictEqual([]);
    });

    it('should handle database error', async () => {
      jest
        .spyOn(service, 'schools')
        .mockRejectedValue(new Error('Database error'));
      await expect(service.schools()).rejects.toThrow('Database error');
    });
  });

  describe('BlockSchools', () => {
    it('should block schools', async () => {
      jest
        .spyOn(prisma.dailycheckapp_school, 'updateMany')
        .mockResolvedValue(null);

      const result = await service.blockSchools([1]);
      expect(result).toEqual(true);
    });

    it('should handle database error', async () => {
      jest
        .spyOn(prisma.dailycheckapp_school, 'updateMany')
        .mockRejectedValue(new Error('Database error'));

      await expect(service.blockSchools([1])).rejects.toThrow('Database error');
    });
  });

  describe('UnblockSchools', () => {
    it('should unblock schools', async () => {
      jest
        .spyOn(prisma.dailycheckapp_school, 'updateMany')
        .mockResolvedValue(null);

      const result = await service.unblockSchools([1]);
      expect(result).toEqual(true);
    });

    it('should handle database error', async () => {
      jest
        .spyOn(prisma.dailycheckapp_school, 'updateMany')
        .mockRejectedValue(new Error('Database error'));

      await expect(service.unblockSchools([1])).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('NotifySchools', () => {
    it('should notify schools', async () => {
      jest
        .spyOn(prisma.dailycheckapp_school, 'updateMany')
        .mockResolvedValue(null);

      const result = await service.notifySchools([1]);
      expect(result).toEqual(true);
    });

    it('should handle database error', async () => {
      jest
        .spyOn(prisma.dailycheckapp_school, 'updateMany')
        .mockRejectedValue(new Error('Database error'));

      await expect(service.notifySchools([1])).rejects.toThrow(
        'Database error',
      );
    });
  });
});
