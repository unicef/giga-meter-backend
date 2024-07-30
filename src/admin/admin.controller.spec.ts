import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuthGuard } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { HttpModule } from '@nestjs/axios';
import { mockAdminSchoolDto } from '../common/mock-objects';

describe('AdminController', () => {
  let controller: AdminController;
  let service: AdminService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [AdminService, PrismaService, AuthGuard],
      imports: [HttpModule],
    }).compile();

    controller = app.get<AdminController>(AdminController);
    service = app.get<AdminService>(AdminService);
  });

  it('controller should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('service should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('GetSchools', () => {
    it('should get schools', async () => {
      jest.spyOn(service, 'schools').mockResolvedValue(mockAdminSchoolDto);

      expect(await controller.getSchools()).toStrictEqual(mockAdminSchoolDto);
    });

    it('should handle empty result set', async () => {
      jest.spyOn(service, 'schools').mockResolvedValue([]);

      expect(await controller.getSchools()).toStrictEqual([]);
    });

    it('should handle database error', async () => {
      jest
        .spyOn(service, 'schools')
        .mockRejectedValue(new Error('Database error'));
      await expect(controller.getSchools()).rejects.toThrow('Database error');
    });
  });

  describe('BlockSchools', () => {
    it('should block schools', async () => {
      jest.spyOn(service, 'blockSchools').mockResolvedValue(true);

      expect(await controller.blockSchools([1])).toBe(true);
    });

    it('should handle failure', async () => {
      jest.spyOn(service, 'blockSchools').mockResolvedValue(false);

      expect(await controller.blockSchools([1])).toBe(false);
    });

    it('should handle database error', async () => {
      jest
        .spyOn(service, 'blockSchools')
        .mockRejectedValue(new Error('Database error'));
      await expect(controller.blockSchools([1])).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('UnblockSchools', () => {
    it('should unblock schools', async () => {
      jest.spyOn(service, 'unblockSchools').mockResolvedValue(true);

      expect(await controller.unblockSchools([1])).toBe(true);
    });

    it('should handle failure', async () => {
      jest.spyOn(service, 'unblockSchools').mockResolvedValue(false);

      expect(await controller.unblockSchools([1])).toBe(false);
    });

    it('should handle database error', async () => {
      jest
        .spyOn(service, 'unblockSchools')
        .mockRejectedValue(new Error('Database error'));
      await expect(controller.unblockSchools([1])).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('notifySchools', () => {
    it('should notify schools', async () => {
      jest.spyOn(service, 'notifySchools').mockResolvedValue(true);

      expect(await controller.notifySchools([1])).toBe(true);
    });

    it('should handle failure', async () => {
      jest.spyOn(service, 'notifySchools').mockResolvedValue(false);

      expect(await controller.notifySchools([1])).toBe(false);
    });

    it('should handle database error', async () => {
      jest
        .spyOn(service, 'notifySchools')
        .mockRejectedValue(new Error('Database error'));
      await expect(controller.notifySchools([1])).rejects.toThrow(
        'Database error',
      );
    });
  });
});
