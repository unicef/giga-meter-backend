import { Test, TestingModule } from '@nestjs/testing';
import { FlaggedSchoolController } from './flagged-school.controller';
import { FlaggedSchoolService } from './flagged-school.service';
import { AuthGuard } from 'src/auth/auth.guard';

describe('FlaggedSchoolController', () => {
  let flaggedSchoolController: FlaggedSchoolController;
  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [FlaggedSchoolController],
      providers: [FlaggedSchoolService],
      imports: [AuthGuard],
    }).compile();

    flaggedSchoolController = app.get<FlaggedSchoolController>(
      FlaggedSchoolController,
    );
  });

  it('should be defined', () => {
    expect(flaggedSchoolController).toBeDefined();
  });
});
