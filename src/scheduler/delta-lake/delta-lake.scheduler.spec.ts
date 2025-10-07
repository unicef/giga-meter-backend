import { Test, TestingModule } from '@nestjs/testing';
import { DeltaLakeService } from './delta-lake.scheduler';

describe('DeltaLakeService', () => {
  let service: DeltaLakeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeltaLakeService],
    }).compile();

    service = module.get<DeltaLakeService>(DeltaLakeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
