import { Test, TestingModule } from '@nestjs/testing';
import { DataFixController } from './data-fix.controller';
import { HttpModule } from '@nestjs/axios';
import { AuthGuard } from '../auth/auth.guard';
import { JwtService } from '@nestjs/jwt';

describe('DataFixController', () => {
  let controller: DataFixController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [DataFixController],
      providers: [AuthGuard, JwtService],
      imports: [HttpModule],
    }).compile();

    controller = app.get<DataFixController>(DataFixController);
  });

  it('controller should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('DataFix', () => {
    it('should return empty result set', async () => {
      const response = await controller.dataFix();
      expect(response.data).toStrictEqual([]);
    });
  });
});
