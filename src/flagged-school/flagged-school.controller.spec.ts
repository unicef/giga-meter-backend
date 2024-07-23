import { Test, TestingModule } from '@nestjs/testing';
import { FlaggedSchoolController } from './flagged-school.controller';
import { FlaggedSchoolService } from './flagged-school.service';
import { AuthGuard } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { HttpModule } from '@nestjs/axios';

describe('FlaggedSchoolController', () => {
  let controller: FlaggedSchoolController;
  let service: FlaggedSchoolService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [FlaggedSchoolController],
      providers: [FlaggedSchoolService, PrismaService, AuthGuard],
      imports: [HttpModule],
    }).compile();

    controller = app.get<FlaggedSchoolController>(FlaggedSchoolController);
    service = app.get<FlaggedSchoolService>(FlaggedSchoolService);
  });

  it('controller should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('service should be defined', () => {
    expect(service).toBeDefined();
  });
});
