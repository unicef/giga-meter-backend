import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuthGuard } from 'src/auth/auth.guard';

describe('AdminController', () => {
  let adminController: AdminController;
  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [AdminService],
      imports: [AuthGuard],
    }).compile();

    adminController = app.get<AdminController>(AdminController);
  });

  it('should be defined', () => {
    expect(adminController).toBeDefined();
  });
});
