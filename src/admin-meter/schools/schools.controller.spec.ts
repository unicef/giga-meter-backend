import { Test, TestingModule } from '@nestjs/testing';
import { SchoolsController } from './schools.controller';
import { SchoolsService } from './schools.service';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';

describe('SchoolsController', () => {
  let controller: SchoolsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SchoolsController],
      providers: [
        {
          provide: SchoolsService,
          useValue: {
            getSchoolsAndDeviceCount: jest.fn(),
            toggleIsActiveDevice: jest.fn(),
            toggleIsActiveSchool: jest.fn(),
            updateFeatureBySchool: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(AdminAuthGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) })
      .compile();

    controller = module.get<SchoolsController>(SchoolsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
