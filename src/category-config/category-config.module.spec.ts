import { Test, TestingModule } from '@nestjs/testing';
import { CategoryConfigModule } from './category-config.module';
import { CategoryConfigService } from './category-config.service';
import { CategoryConfigController } from './category-config.controller';
import { PrismaService } from '../prisma/prisma.service';
import { HttpModule } from '@nestjs/axios';

describe('CategoryConfigModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [CategoryConfigModule],
    })
    .overrideProvider(PrismaService).useValue({})
    .compile();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should provide CategoryConfigService', () => {
    const service = module.get<CategoryConfigService>(CategoryConfigService);
    expect(service).toBeDefined();
  });

  it('should provide CategoryConfigController', () => {
    const controller = module.get<CategoryConfigController>(CategoryConfigController);
    expect(controller).toBeDefined();
  });

  it('should provide HttpModule', () => {
    const http = module.get<HttpModule>(HttpModule);
    expect(http).toBeDefined();
  });
});
