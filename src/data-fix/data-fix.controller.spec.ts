import { Test, TestingModule } from '@nestjs/testing';
import { DataFixController } from './data-fix.controller';
import { HttpModule } from '@nestjs/axios';
import { AuthGuard } from '../auth/auth.guard';
import { CategoryConfigProvider } from '../common/category-config.provider';
import { mockCategoryConfigProvider } from 'src/common/mock-objects';

describe('DataFixController', () => {
  let controller: DataFixController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [DataFixController],
      providers: [
        AuthGuard,
        { provide: CategoryConfigProvider, useValue: mockCategoryConfigProvider },
      ],
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
