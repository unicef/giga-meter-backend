import { Test, TestingModule } from '@nestjs/testing';
import { FlaggedSchoolController } from './flagged-school.controller';
import { FlaggedSchoolService } from './flagged-school.service';
import { AuthGuard } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { HttpModule } from '@nestjs/axios';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { mockCategoryConfigProvider, mockFlaggedSchoolDto } from '../common/mock-objects';
import { CategoryConfigProvider } from '../common/category-config.provider';

describe('FlaggedSchoolController', () => {
  let controller: FlaggedSchoolController;
  let service: FlaggedSchoolService;

  beforeEach(async () => {
    const mockPrismaService = {
      // Add any required PrismaService methods used in tests
    };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [FlaggedSchoolController],
      providers: [
        FlaggedSchoolService,
        { provide: PrismaService, useValue: mockPrismaService },
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

    controller = app.get<FlaggedSchoolController>(FlaggedSchoolController);
    service = app.get<FlaggedSchoolService>(FlaggedSchoolService);
  });

  it('controller should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('service should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('GetSchools', () => {
    it('should get schools', async () => {
      jest.spyOn(service, 'schools').mockResolvedValue(mockFlaggedSchoolDto);

      const response = await controller.getSchools();
      expect(response.data).toStrictEqual(mockFlaggedSchoolDto);
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

  describe('GetSchoolsByCountryId', () => {
    it('should get schools', async () => {
      jest
        .spyOn(service, 'schoolsByCountryId')
        .mockResolvedValue(mockFlaggedSchoolDto);

      const response = await controller.getSchoolsByCountryId('IN', true);
      expect(response.data).toStrictEqual(mockFlaggedSchoolDto);
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

  describe('CreateSchool', () => {
    it('should create school', async () => {
      jest.spyOn(service, 'createSchool').mockResolvedValue('1');

      const response = await controller.createSchool(mockFlaggedSchoolDto[0]);
      expect(response.data).toStrictEqual('1');
    });

    it('should handle database error', async () => {
      jest
        .spyOn(service, 'createSchool')
        .mockRejectedValue(new Error('Database error'));
      await expect(
        controller.createSchool(mockFlaggedSchoolDto[0]),
      ).rejects.toThrow('Database error');
    });
  });
});
