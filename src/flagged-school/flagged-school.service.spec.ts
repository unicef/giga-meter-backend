import { Test, TestingModule } from '@nestjs/testing';
import { FlaggedSchoolService } from './flagged-school.service';
import { PrismaService } from '../prisma/prisma.service';

describe('FlaggedSchoolService', () => {
  let service: FlaggedSchoolService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FlaggedSchoolService, PrismaService],
    }).compile();

    service = module.get<FlaggedSchoolService>(FlaggedSchoolService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
