import { Test, TestingModule } from '@nestjs/testing';
import { FeatureFlagService } from './feature-flag.service';

describe('FeatureFlagService', () => {
  let service: FeatureFlagService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FeatureFlagService],
    }).compile();

    service = module.get<FeatureFlagService>(FeatureFlagService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
