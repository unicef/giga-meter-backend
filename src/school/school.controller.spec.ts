import { Test, TestingModule } from '@nestjs/testing';
import { SchoolController } from './school.controller';
import { SchoolService } from './school.service';
import { AuthGuard } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { HttpModule } from '@nestjs/axios';
import { mockCategoryConfigProvider, mockSchoolDto } from '../common/mock-objects';
import { ConnectivityService } from 'src/connectivity/connectivity.service';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CategoryConfigProvider } from '../common/category-config.provider';

describe('SchoolController', () => {
  let controller: SchoolController;
  let service: SchoolService;

  beforeEach(async () => {
    const mockPrismaService = {
      // Add any required PrismaService methods used in tests
    };

    const mockConnectivityService = {
      // Add any required ConnectivityService methods used in tests
    };

    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      reset: jest.fn(),
    };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [SchoolController],
      providers: [
        SchoolService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConnectivityService, useValue: mockConnectivityService },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: APP_GUARD,
          useClass: AuthGuard,
        },
        {
          provide: APP_GUARD,
          useClass: ThrottlerGuard,
        },
        {
          provide: CategoryConfigProvider,
          useValue: mockCategoryConfigProvider,
        },
      ],
      imports: [
        HttpModule,
        ThrottlerModule.forRoot([
          {
            ttl: 60,
            limit: 10,
          },
        ]),
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({
        canActivate: () => Promise.resolve(true),
      })
      .compile();

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
});
