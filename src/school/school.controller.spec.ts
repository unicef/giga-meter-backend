import { Test, TestingModule } from '@nestjs/testing';
import { SchoolController } from './school.controller';
import { SchoolService } from './school.service';
import { AuthGuard } from 'src/auth/auth.guard';

describe('SchoolController', () => {
  let schoolController: SchoolController;
  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [SchoolController],
      providers: [SchoolService],
      imports: [AuthGuard],
    }).compile();

    schoolController = app.get<SchoolController>(SchoolController);
  });

  it('should be defined', () => {
    expect(schoolController).toBeDefined();
  });
});
