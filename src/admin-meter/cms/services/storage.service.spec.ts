import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StorageService],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should determine storage type based on environment', () => {
    const isUsingAzure = service.isUsingAzure();
    expect(typeof isUsingAzure).toBe('boolean');
  });

  describe('getFileUrl', () => {
    it('should return file URL', async () => {
      const url = await service.getFileUrl('test/path/image.jpg');
      expect(url).toBeDefined();
      expect(typeof url).toBe('string');
    });
  });
});
