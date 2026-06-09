import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { NonceService, NonceValidationResult } from './nonce.service';
import { Logger } from '@nestjs/common';

describe('NonceService', () => {
  let service: NonceService;
  let cacheManager: any;
  const originalEnv = process.env;

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    // Reset environment variables
    process.env = { ...originalEnv };
    process.env.DEVICE_TOKEN_NONCE_TTL = '3600'; // 1 hour for testing

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NonceService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<NonceService>(NonceService);
    cacheManager = module.get(CACHE_MANAGER);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('generateNonce', () => {
    it('should generate a valid base64 nonce', () => {
      const nonce = service.generateNonce();
      
      expect(nonce).toBeDefined();
      expect(typeof nonce).toBe('string');
      expect(nonce.length).toBeGreaterThan(0);
      
      // Should be valid base64
      expect(() => Buffer.from(nonce, 'base64')).not.toThrow();
      
      // Should decode to 32 bytes
      const decoded = Buffer.from(nonce, 'base64');
      expect(decoded.length).toBe(32);
    });

    it('should generate unique nonces', () => {
      const nonce1 = service.generateNonce();
      const nonce2 = service.generateNonce();
      
      expect(nonce1).not.toBe(nonce2);
    });

    it('should handle generation errors gracefully', () => {
      // Mock crypto.randomBytes to throw an error
      const originalRandomBytes = require('crypto').randomBytes;
      require('crypto').randomBytes = jest.fn().mockImplementation(() => {
        throw new Error('Crypto error');
      });

      expect(() => service.generateNonce()).toThrow('Nonce generation failed');

      // Restore original function
      require('crypto').randomBytes = originalRandomBytes;
    });
  });

  describe('validateAndConsumeNonce', () => {
    const validNonce = 'dGVzdC1ub25jZS0zMi1ieXRlcy1mb3ItdGVzdGluZw=='; // 32 bytes when decoded
    const deviceId = 'test-device-id';

    it('should validate and consume a new nonce', async () => {
      mockCacheManager.get.mockResolvedValue(null); // Nonce not used
      mockCacheManager.set.mockResolvedValue(undefined);

      const result = await service.validateAndConsumeNonce(validNonce, deviceId);

      expect(result.isValid).toBe(true);
      expect(result.reason).toBeUndefined();
      expect(mockCacheManager.get).toHaveBeenCalledWith(expect.stringContaining('nonce:'));
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining('nonce:'),
        expect.objectContaining({
          deviceId,
          usedAt: expect.any(Number),
          originalNonce: expect.stringContaining('dGVzdC1ub25jZS0z'),
        }),
        3600000 // TTL in milliseconds
      );
    });

    it('should reject already used nonce (replay attack)', async () => {
      const existingNonceData = {
        deviceId: 'other-device',
        usedAt: Date.now() - 1000,
        originalNonce: 'dGVzdC1ub25jZS0z...',
      };
      mockCacheManager.get.mockResolvedValue(existingNonceData);

      const result = await service.validateAndConsumeNonce(validNonce, deviceId);

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Nonce has already been used (replay attack detected)');
      expect(mockCacheManager.set).not.toHaveBeenCalled();
    });

    it('should reject empty nonce', async () => {
      const result1 = await service.validateAndConsumeNonce('', deviceId);
      const result2 = await service.validateAndConsumeNonce('   ', deviceId);

      expect(result1.isValid).toBe(false);
      expect(result1.reason).toBe('Nonce cannot be empty');
      expect(result2.isValid).toBe(false);
      expect(result2.reason).toBe('Nonce cannot be empty');
      expect(mockCacheManager.get).not.toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      mockCacheManager.get.mockRejectedValue(new Error('Redis connection failed'));

      const result = await service.validateAndConsumeNonce(validNonce, deviceId);

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Nonce validation error');
    });

    it('should work without deviceId parameter', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockCacheManager.set.mockResolvedValue(undefined);

      const result = await service.validateAndConsumeNonce(validNonce);

      expect(result.isValid).toBe(true);
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining('nonce:'),
        expect.objectContaining({
          deviceId: 'unknown',
        }),
        expect.any(Number)
      );
    });
  });

  describe('isNonceUsed', () => {
    const validNonce = 'dGVzdC1ub25jZS0zMi1ieXRlcy1mb3ItdGVzdGluZw==';

    it('should return true for used nonce', async () => {
      const existingNonceData = { deviceId: 'test', usedAt: Date.now() };
      mockCacheManager.get.mockResolvedValue(existingNonceData);

      const result = await service.isNonceUsed(validNonce);

      expect(result).toBe(true);
      expect(mockCacheManager.get).toHaveBeenCalledWith(expect.stringContaining('nonce:'));
    });

    it('should return false for unused nonce', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      const result = await service.isNonceUsed(validNonce);

      expect(result).toBe(false);
    });

    it('should return false for empty nonce', async () => {
      const result1 = await service.isNonceUsed('');
      const result2 = await service.isNonceUsed('   ');

      expect(result1).toBe(false);
      expect(result2).toBe(false);
      expect(mockCacheManager.get).not.toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      mockCacheManager.get.mockRejectedValue(new Error('Redis error'));

      const result = await service.isNonceUsed(validNonce);

      expect(result).toBe(false); // Assume not used on error
    });
  });

  describe('invalidateNonce', () => {
    const validNonce = 'dGVzdC1ub25jZS0zMi1ieXRlcy1mb3ItdGVzdGluZw==';

    it('should invalidate a nonce successfully', async () => {
      mockCacheManager.set.mockResolvedValue(undefined);

      const result = await service.invalidateNonce(validNonce, 'Test invalidation');

      expect(result).toBe(true);
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining('nonce:'),
        expect.objectContaining({
          invalidatedAt: expect.any(Number),
          reason: 'Test invalidation',
          originalNonce: expect.stringContaining('dGVzdC1ub25jZS0z'),
        }),
        expect.any(Number)
      );
    });

    it('should use default reason when not provided', async () => {
      mockCacheManager.set.mockResolvedValue(undefined);

      const result = await service.invalidateNonce(validNonce);

      expect(result).toBe(true);
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          reason: 'Manual invalidation',
        }),
        expect.any(Number)
      );
    });

    it('should return false for empty nonce', async () => {
      const result1 = await service.invalidateNonce('');
      const result2 = await service.invalidateNonce('   ');

      expect(result1).toBe(false);
      expect(result2).toBe(false);
      expect(mockCacheManager.set).not.toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      mockCacheManager.set.mockRejectedValue(new Error('Redis error'));

      const result = await service.invalidateNonce(validNonce);

      expect(result).toBe(false);
    });
  });

  describe('getNonceStats', () => {
    it('should return stats with Redis connected', async () => {
      mockCacheManager.set.mockResolvedValue(undefined);
      mockCacheManager.get.mockResolvedValue('test');
      mockCacheManager.del.mockResolvedValue(undefined);

      const stats = await service.getNonceStats();

      expect(stats.redisConnected).toBe(true);
      expect(stats.totalUsedNonces).toBe(-1); // Not implemented in basic version
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining('nonce:health_check'),
        'test',
        1000
      );
      expect(mockCacheManager.del).toHaveBeenCalledWith(
        expect.stringContaining('nonce:health_check')
      );
    });

    it('should return stats with Redis disconnected on error', async () => {
      mockCacheManager.set.mockRejectedValue(new Error('Redis error'));

      const stats = await service.getNonceStats();

      expect(stats.redisConnected).toBe(false);
      expect(stats.totalUsedNonces).toBe(-1);
    });
  });

  describe('isValidNonceFormat', () => {
    it('should validate correct nonce format', () => {
      const validNonce = 'dGVzdC1ub25jZS0zMi1ieXRlcy1mb3ItdGVzdGluZw=='; // 32 bytes
      
      expect(service.isValidNonceFormat(validNonce)).toBe(true);
    });

    it('should reject short nonces', () => {
      const shortNonce = 'c2hvcnQ='; // "short" in base64 (5 bytes)
      
      expect(service.isValidNonceFormat(shortNonce)).toBe(false);
    });

    it('should reject invalid base64', () => {
      const invalidBase64 = 'not-base64!@#$%';
      
      expect(service.isValidNonceFormat(invalidBase64)).toBe(false);
    });

    it('should reject null/undefined/empty nonces', () => {
      expect(service.isValidNonceFormat(null as any)).toBe(false);
      expect(service.isValidNonceFormat(undefined as any)).toBe(false);
      expect(service.isValidNonceFormat('')).toBe(false);
      expect(service.isValidNonceFormat(123 as any)).toBe(false);
    });
  });

  describe('environment configuration', () => {
    it('should use custom TTL from environment', async () => {
      process.env.DEVICE_TOKEN_NONCE_TTL = '7200'; // 2 hours
      
      mockCacheManager.get.mockResolvedValue(null);
      mockCacheManager.set.mockResolvedValue(undefined);

      const validNonce = 'dGVzdC1ub25jZS0zMi1ieXRlcy1mb3ItdGVzdGluZw==';
      await service.validateAndConsumeNonce(validNonce, 'test-device');

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        7200000 // 2 hours in milliseconds
      );
    });

    it('should use default TTL when environment variable is invalid', async () => {
      process.env.DEVICE_TOKEN_NONCE_TTL = 'invalid-number';
      
      mockCacheManager.get.mockResolvedValue(null);
      mockCacheManager.set.mockResolvedValue(undefined);

      const validNonce = 'dGVzdC1ub25jZS0zMi1ieXRlcy1mb3ItdGVzdGluZw==';
      await service.validateAndConsumeNonce(validNonce, 'test-device');

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        86400000 // 24 hours in milliseconds (default)
      );
    });
  });

  describe('nonce key generation', () => {
    it('should generate consistent keys for same nonce', async () => {
      const nonce = 'dGVzdC1ub25jZS0zMi1ieXRlcy1mb3ItdGVzdGluZw==';
      
      mockCacheManager.get.mockResolvedValue(null);
      mockCacheManager.set.mockResolvedValue(undefined);

      await service.validateAndConsumeNonce(nonce, 'device1');
      await service.isNonceUsed(nonce);

      const calls = mockCacheManager.get.mock.calls;
      expect(calls[0][0]).toBe(calls[1][0]); // Same key used
      expect(calls[0][0]).toMatch(/^nonce:[a-f0-9]{64}$/); // SHA-256 hash format
    });

    it('should generate different keys for different nonces', async () => {
      const nonce1 = 'dGVzdC1ub25jZS0xLTMyLWJ5dGVzLWZvci10ZXN0aW5n';
      const nonce2 = 'dGVzdC1ub25jZS0yLTMyLWJ5dGVzLWZvci10ZXN0aW5n';
      
      mockCacheManager.get.mockResolvedValue(null);

      await service.isNonceUsed(nonce1);
      await service.isNonceUsed(nonce2);

      const calls = mockCacheManager.get.mock.calls;
      expect(calls[0][0]).not.toBe(calls[1][0]); // Different keys
    });
  });
});
