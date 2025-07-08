import { Test, TestingModule } from '@nestjs/testing';
import { SchoolController } from './school.controller';
import { SchoolService } from './school.service';
import { AuthGuard } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { HttpModule } from '@nestjs/axios';
import { mockSchoolDto, mockSchoolEmailUpdateDto } from '../common/mock-objects';
import { ConnectivityService } from 'src/connectivity/connectivity.service';

describe('SchoolController', () => {
  let controller: SchoolController;
  let service: SchoolService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [SchoolController],
      providers: [SchoolService, PrismaService, AuthGuard, ConnectivityService],
      imports: [HttpModule],
    }).compile();

    controller = app.get<SchoolController>(SchoolController);
    service = app.get<SchoolService>(SchoolService);
  });

  it('controller should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('service should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('GetSchools', () => {
    it('should get schools', async () => {
      jest.spyOn(service, 'schools').mockResolvedValue(mockSchoolDto);

      const response = await controller.getSchools();
      expect(response.data).toStrictEqual(mockSchoolDto);
    });

    it('should handle empty result set', async () => {
      jest.spyOn(service, 'schools').mockResolvedValue([]);

      const response = await controller.getSchools();
      expect(response.data).toStrictEqual([]);
    });

    it('should handle database error', async () => {
      jest
        .spyOn(service, 'schools')
        .mockRejectedValue(new Error('Database error'));
      await expect(controller.getSchools()).rejects.toThrow('Database error');
    });
  });

  describe('GetSchoolsByGigaId', () => {
    it('should get schools', async () => {
      jest.spyOn(service, 'schoolsByGigaId').mockResolvedValue(mockSchoolDto);

      const response = await controller.getSchoolsByGigaId('1234');
      expect(response.data).toStrictEqual(mockSchoolDto);
    });

    it('should handle empty result set', async () => {
      jest.spyOn(service, 'schoolsByGigaId').mockResolvedValue([]);

      const response = await controller.getSchoolsByGigaId('1234');
      expect(response.data).toStrictEqual([]);
    });

    it('should handle database error', async () => {
      jest
        .spyOn(service, 'schoolsByGigaId')
        .mockRejectedValue(new Error('Database error'));
      await expect(controller.getSchoolsByGigaId('1234')).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('GetSchoolsById', () => {
    it('should get schools', async () => {
      jest.spyOn(service, 'schoolsById').mockResolvedValue(mockSchoolDto);

      const response = await controller.getSchoolsById(1234);
      expect(response.data).toStrictEqual(mockSchoolDto);
    });

    it('should handle empty result set', async () => {
      jest.spyOn(service, 'schoolsById').mockResolvedValue([]);

      const response = await controller.getSchoolsById(1234);
      expect(response.data).toStrictEqual([]);
    });

    it('should handle database error', async () => {
      jest
        .spyOn(service, 'schoolsById')
        .mockRejectedValue(new Error('Database error'));
      await expect(controller.getSchoolsById(1234)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('GetSchoolsByCountryId', () => {
    it('should get schools', async () => {
      jest
        .spyOn(service, 'schoolsByCountryId')
        .mockResolvedValue(mockSchoolDto);

      const response = await controller.getSchoolsByCountryId('IN', true);
      expect(response.data).toStrictEqual(mockSchoolDto);
    });

    it('should handle empty result set', async () => {
      jest.spyOn(service, 'schoolsByCountryId').mockResolvedValue([]);

      const response = await controller.getSchoolsByCountryId('IN', true);
      expect(response.data).toStrictEqual([]);
    });

    it('should handle database error', async () => {
      jest
        .spyOn(service, 'schoolsByCountryId')
        .mockRejectedValue(new Error('Database error'));
      await expect(
        controller.getSchoolsByCountryId('IN', true),
      ).rejects.toThrow('Database error');
    });
  });

  describe('CheckNotify', () => {
    it('should get notify true', async () => {
      jest.spyOn(service, 'checkNotify').mockResolvedValue(true);

      const response = await controller.checkNotify('1234');
      expect(response.data.notify).toStrictEqual(true);
    });

    it('should get notify false', async () => {
      jest.spyOn(service, 'checkNotify').mockResolvedValue(false);

      const response = await controller.checkNotify('1234');
      expect(response.data.notify).toStrictEqual(false);
    });

    it('should handle database error', async () => {
      jest
        .spyOn(service, 'checkNotify')
        .mockRejectedValue(new Error('Database error'));
      await expect(controller.checkNotify('1234')).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('CreateSchool', () => {
    it('should create school', async () => {
      jest.spyOn(service, 'createSchool').mockResolvedValue('1');

      const response = await controller.createSchool(mockSchoolDto[0]);
      expect(response.data).toStrictEqual({ user_id: '1' });
    });

    it('should handle database error', async () => {
      jest
        .spyOn(service, 'createSchool')
        .mockRejectedValue(new Error('Database error'));
      await expect(controller.createSchool(mockSchoolDto[0])).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('UpdateSchoolEmail', () => {
    it('should update school email and return user_id', async () => {
      jest.spyOn(service, 'updateSchoolEmail').mockResolvedValue(mockSchoolEmailUpdateDto.user_id);
      const response = await controller.updateSchoolEmail(mockSchoolEmailUpdateDto);
      expect(response.data).toStrictEqual({ user_id: mockSchoolEmailUpdateDto.user_id });
      expect(response.success).toBe(true);
    });
    it('should handle error from service', async () => {
      jest.spyOn(service, 'updateSchoolEmail').mockRejectedValue(new Error('Update error'));
      await expect(controller.updateSchoolEmail(mockSchoolEmailUpdateDto)).rejects.toThrow('Update error');
    });
  });
});
