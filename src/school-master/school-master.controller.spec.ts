import { Test, TestingModule } from '@nestjs/testing';
import { SchoolMasterController } from './school-master.controller';
import { SchoolMasterService } from './school-master.service';
import { AuthGuard } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { HttpModule } from '@nestjs/axios';
import {
  mockFeatureFlagsDto,
  mockSchoolMasterDto,
} from '../common/mock-objects';
import { JwtService } from '@nestjs/jwt';

describe('SchoolMasterController', () => {
  let controller: SchoolMasterController;
  let service: SchoolMasterService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [SchoolMasterController],
      providers: [SchoolMasterService, PrismaService, AuthGuard, JwtService],
      imports: [HttpModule],
    }).compile();

    controller = app.get<SchoolMasterController>(SchoolMasterController);
    service = app.get<SchoolMasterService>(SchoolMasterService);
  });

  it('controller should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('service should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('CheckSchool', () => {
    it('should check school', async () => {
      jest.spyOn(service, 'checkSchool').mockResolvedValue(mockSchoolMasterDto);

      const response = await controller.checkSchool('IN', '11');
      expect(response.data).toStrictEqual(mockSchoolMasterDto);
    });

    it('should handle empty result set', async () => {
      jest.spyOn(service, 'checkSchool').mockResolvedValue([]);

      const response = await controller.checkSchool('IN', '22');
      expect(response.data).toStrictEqual([]);
    });

    it('should handle database error', async () => {
      jest
        .spyOn(service, 'checkSchool')
        .mockRejectedValue(new Error('Database error'));
      await expect(controller.checkSchool('IN', '11')).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('GetFlagsByGigaId', () => {
    it('should get flags', async () => {
      jest
        .spyOn(service, 'flagsByGigaId')
        .mockResolvedValue(mockFeatureFlagsDto);

      const response = await controller.getFlagsByGigaId('1234');
      expect(response.data).toStrictEqual(mockFeatureFlagsDto);
    });

    it('should handle empty object', async () => {
      jest.spyOn(service, 'flagsByGigaId').mockResolvedValue({});

      const response = await controller.getFlagsByGigaId('1234');
      expect(response.data).toStrictEqual({});
    });

    it('should handle database error', async () => {
      jest
        .spyOn(service, 'flagsByGigaId')
        .mockRejectedValue(new Error('Database error'));
      await expect(controller.getFlagsByGigaId('1234')).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('SetFlagsByGigaId', () => {
    it('should set flags', async () => {
      jest.spyOn(service, 'setFlagsByGigaId').mockResolvedValue(true);

      const response = await controller.setFlagsByGigaId(
        '1234',
        mockFeatureFlagsDto,
      );
      expect(response.data).toStrictEqual(true);
    });

    it('should handle database error', async () => {
      jest
        .spyOn(service, 'setFlagsByGigaId')
        .mockRejectedValue(new Error('Database error'));
      await expect(
        controller.setFlagsByGigaId('1234', mockFeatureFlagsDto),
      ).rejects.toThrow('Database error');
    });
  });
});
