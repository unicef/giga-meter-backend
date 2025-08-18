import { Test, TestingModule } from '@nestjs/testing';
import { HmacSignatureService, HmacValidationResult, HmacSignatureParams } from './hmac-signature.service';

describe('HmacSignatureService', () => {
  let service: HmacSignatureService;
  const originalEnv = process.env;

  beforeEach(async () => {
    // Reset environment variables
    process.env = { ...originalEnv };
    process.env.DEVICE_TOKEN_HMAC_SECRET = 'test-hmac-secret-for-unit-testing';

    const module: TestingModule = await Test.createTestingModule({
      providers: [HmacSignatureService],
    }).compile();

    service = module.get<HmacSignatureService>(HmacSignatureService);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('generateSignature', () => {
    const validParams: HmacSignatureParams = {
      token: 'test-token',
      nonce: 'test-nonce',
      payload: { test: 'data' },
      timestamp: 1692123456789,
    };

    it('should generate a valid HMAC signature', () => {
      const signature = service.generateSignature(validParams);
      
      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(signature.length).toBeGreaterThan(0);
      
      // Should be valid base64
      expect(() => Buffer.from(signature, 'base64')).not.toThrow();
      
      // SHA-256 HMAC should produce 32 bytes when decoded
      const decoded = Buffer.from(signature, 'base64');
      expect(decoded.length).toBe(32);
    });

    it('should generate consistent signatures for same input', () => {
      const signature1 = service.generateSignature(validParams);
      const signature2 = service.generateSignature(validParams);
      
      expect(signature1).toBe(signature2);
    });

    it('should generate different signatures for different inputs', () => {
      const signature1 = service.generateSignature(validParams);
      const signature2 = service.generateSignature({
        ...validParams,
        nonce: 'different-nonce',
      });
      
      expect(signature1).not.toBe(signature2);
    });

    it('should handle missing payload', () => {
      const paramsWithoutPayload = {
        token: 'test-token',
        nonce: 'test-nonce',
        timestamp: 1692123456789,
      };
      
      const signature = service.generateSignature(paramsWithoutPayload);
      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
    });

    it('should handle missing timestamp', () => {
      const paramsWithoutTimestamp = {
        token: 'test-token',
        nonce: 'test-nonce',
        payload: { test: 'data' },
      };
      
      const signature = service.generateSignature(paramsWithoutTimestamp);
      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
    });

    it('should throw error for missing required parameters', () => {
      expect(() => service.generateSignature({ token: '', nonce: 'test-nonce' }))
        .toThrow('Token and nonce are required for HMAC signature generation');
      
      expect(() => service.generateSignature({ token: 'test-token', nonce: '' }))
        .toThrow('Token and nonce are required for HMAC signature generation');
    });
  });

  describe('validateSignature', () => {
    const validParams: HmacSignatureParams = {
      token: 'test-token',
      nonce: 'test-nonce',
      payload: { test: 'data' },
      timestamp: Date.now(),
    };

    it('should validate correct signature', async () => {
      const signature = service.generateSignature(validParams);
      const result = await service.validateSignature(signature, validParams);
      
      expect(result.isValid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should reject invalid signature', async () => {
      const invalidSignature = 'aW52YWxpZC1zaWduYXR1cmUtZm9yLXRlc3RpbmctcHVycG9zZXM=';
      const result = await service.validateSignature(invalidSignature, validParams);
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('HMAC signature mismatch');
    });

    it('should reject empty signature', async () => {
      const result = await service.validateSignature('', validParams);
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('HMAC signature cannot be empty');
    });

    it('should reject missing token or nonce', async () => {
      const signature = service.generateSignature(validParams);
      
      const result1 = await service.validateSignature(signature, { ...validParams, token: '' });
      expect(result1.isValid).toBe(false);
      expect(result1.reason).toBe('Token and nonce are required for HMAC validation');
      
      const result2 = await service.validateSignature(signature, { ...validParams, nonce: '' });
      expect(result2.isValid).toBe(false);
      expect(result2.reason).toBe('Token and nonce are required for HMAC validation');
    });

    it('should validate timestamp tolerance', async () => {
      const now = Date.now();
      
      // Valid timestamp (within tolerance)
      const validTimestamp = now - 60000; // 1 minute ago
      const validParams1 = { ...validParams, timestamp: validTimestamp };
      const signature1 = service.generateSignature(validParams1);
      const result1 = await service.validateSignature(signature1, validParams1);
      expect(result1.isValid).toBe(true);
      
      // Too old timestamp (beyond tolerance)
      const oldTimestamp = now - 10 * 60 * 1000; // 10 minutes ago
      const validParams2 = { ...validParams, timestamp: oldTimestamp };
      const signature2 = service.generateSignature(validParams2);
      const result2 = await service.validateSignature(signature2, validParams2);
      expect(result2.isValid).toBe(false);
      expect(result2.reason).toBe('HMAC signature timestamp is too old');
      
      // Future timestamp (beyond tolerance)
      const futureTimestamp = now + 10 * 60 * 1000; // 10 minutes in future
      const validParams3 = { ...validParams, timestamp: futureTimestamp };
      const signature3 = service.generateSignature(validParams3);
      const result3 = await service.validateSignature(signature3, validParams3);
      expect(result3.isValid).toBe(false);
      expect(result3.reason).toBe('HMAC signature timestamp is too far in the future');
    });

    it('should handle signature length mismatch', async () => {
      const shortSignature = 'c2hvcnQ='; // "short" in base64
      const result = await service.validateSignature(shortSignature, validParams);
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Invalid HMAC signature format');
    });
  });

  describe('isValidSignatureFormat', () => {
    it('should validate correct signature format', () => {
      const validParams: HmacSignatureParams = {
        token: 'test-token',
        nonce: 'test-nonce',
      };
      const signature = service.generateSignature(validParams);
      
      expect(service.isValidSignatureFormat(signature)).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(service.isValidSignatureFormat('')).toBe(false);
      expect(service.isValidSignatureFormat(null as any)).toBe(false);
      expect(service.isValidSignatureFormat(undefined as any)).toBe(false);
      expect(service.isValidSignatureFormat(123 as any)).toBe(false);
      expect(service.isValidSignatureFormat('not-base64!@#$%')).toBe(false);
      expect(service.isValidSignatureFormat('c2hvcnQ=')).toBe(false); // Too short
    });
  });

  describe('extractTimestamp', () => {
    it('should extract timestamp from X-Timestamp header', () => {
      const request = {
        headers: { 'x-timestamp': '1692123456789' },
        body: {},
      };
      
      const timestamp = service.extractTimestamp(request);
      expect(timestamp).toBe(1692123456789);
    });

    it('should extract timestamp from request body', () => {
      const request = {
        headers: {},
        body: { timestamp: 1692123456789 },
      };
      
      const timestamp = service.extractTimestamp(request);
      expect(timestamp).toBe(1692123456789);
    });

    it('should prefer header over body', () => {
      const request = {
        headers: { 'x-timestamp': '1692123456789' },
        body: { timestamp: 9999999999999 },
      };
      
      const timestamp = service.extractTimestamp(request);
      expect(timestamp).toBe(1692123456789);
    });

    it('should return undefined for invalid timestamps', () => {
      const request1 = {
        headers: { 'x-timestamp': 'invalid' },
        body: {},
      };
      expect(service.extractTimestamp(request1)).toBeUndefined();
      
      const request2 = {
        headers: {},
        body: { timestamp: 'invalid' },
      };
      expect(service.extractTimestamp(request2)).toBeUndefined();
      
      const request3 = {
        headers: {},
        body: {},
      };
      expect(service.extractTimestamp(request3)).toBeUndefined();
    });
  });

  describe('createSignatureWithTimestamp', () => {
    it('should create signature with current timestamp', () => {
      const params = {
        token: 'test-token',
        nonce: 'test-nonce',
        payload: { test: 'data' },
      };
      
      const before = Date.now();
      const result = service.createSignatureWithTimestamp(params);
      const after = Date.now();
      
      expect(result.signature).toBeDefined();
      expect(result.timestamp).toBeGreaterThanOrEqual(before);
      expect(result.timestamp).toBeLessThanOrEqual(after);
      
      // Verify signature is valid
      expect(service.isValidSignatureFormat(result.signature)).toBe(true);
    });
  });

  describe('validateRequestIntegrity', () => {
    const token = 'test-token';
    const nonce = 'test-nonce';

    it('should validate request with valid HMAC signature', async () => {
      const timestamp = Date.now();
      const payload = { test: 'data' };
      const signature = service.generateSignature({ token, nonce, payload, timestamp });
      
      const request = {
        headers: {
          'x-hmac-signature': signature,
          'x-timestamp': timestamp.toString(),
        },
        body: payload,
      };
      
      const result = await service.validateRequestIntegrity(request, token, nonce);
      expect(result.isValid).toBe(true);
    });

    it('should reject request without HMAC signature', async () => {
      const request = {
        headers: {},
        body: { test: 'data' },
      };
      
      const result = await service.validateRequestIntegrity(request, token, nonce);
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Missing X-HMAC-Signature header');
    });

    it('should reject request with invalid signature format', async () => {
      const request = {
        headers: { 'x-hmac-signature': 'invalid-signature' },
        body: { test: 'data' },
      };
      
      const result = await service.validateRequestIntegrity(request, token, nonce);
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Invalid HMAC signature format');
    });

    it('should reject request with mismatched signature', async () => {
      const wrongSignature = service.generateSignature({
        token: 'wrong-token',
        nonce: 'wrong-nonce',
        payload: { test: 'data' },
        timestamp: Date.now(),
      });
      
      const request = {
        headers: { 'x-hmac-signature': wrongSignature },
        body: { test: 'data' },
      };
      
      const result = await service.validateRequestIntegrity(request, token, nonce);
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('HMAC signature mismatch');
    });
  });

  describe('getConfiguration', () => {
    it('should return configuration with secret configured', () => {
      const config = service.getConfiguration();
      
      expect(config.algorithm).toBe('sha256');
      expect(config.timestampToleranceMs).toBe(5 * 60 * 1000);
      expect(config.secretConfigured).toBe(true);
    });

    it('should return configuration without secret', () => {
      delete process.env.DEVICE_TOKEN_HMAC_SECRET;
      
      const config = service.getConfiguration();
      expect(config.secretConfigured).toBe(false);
    });
  });

  describe('environment configuration', () => {
    it('should use custom HMAC secret from environment', () => {
      process.env.DEVICE_TOKEN_HMAC_SECRET = 'custom-secret-for-testing';
      
      const params: HmacSignatureParams = {
        token: 'test-token',
        nonce: 'test-nonce',
      };
      
      // Generate signature with custom secret
      const signature1 = service.generateSignature(params);
      
      // Change secret and generate again
      process.env.DEVICE_TOKEN_HMAC_SECRET = 'different-secret';
      const signature2 = service.generateSignature(params);
      
      // Signatures should be different
      expect(signature1).not.toBe(signature2);
    });

    it('should use default secret when environment variable not set', () => {
      delete process.env.DEVICE_TOKEN_HMAC_SECRET;
      
      const params: HmacSignatureParams = {
        token: 'test-token',
        nonce: 'test-nonce',
      };
      
      // Should not throw error
      expect(() => service.generateSignature(params)).not.toThrow();
      
      const signature = service.generateSignature(params);
      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
    });
  });

  describe('timing safety', () => {
    it('should use timing-safe comparison for signature validation', async () => {
      const validParams: HmacSignatureParams = {
        token: 'test-token',
        nonce: 'test-nonce',
        timestamp: Date.now(),
      };
      
      const correctSignature = service.generateSignature(validParams);
      
      // Create a signature that differs only in the last character
      const incorrectSignature = correctSignature.slice(0, -1) + 
        (correctSignature.slice(-1) === 'A' ? 'B' : 'A');
      
      // Both validations should take similar time (timing-safe)
      const start1 = process.hrtime.bigint();
      await service.validateSignature(correctSignature, validParams);
      const end1 = process.hrtime.bigint();
      
      const start2 = process.hrtime.bigint();
      await service.validateSignature(incorrectSignature, validParams);
      const end2 = process.hrtime.bigint();
      
      const time1 = Number(end1 - start1);
      const time2 = Number(end2 - start2);
      
      // Times should be similar (within reasonable variance)
      // This is a basic test - in practice, timing attack prevention is more complex
      expect(Math.abs(time1 - time2)).toBeLessThan(time1 * 0.5); // 50% variance tolerance
    });
  });

  describe('error handling', () => {
    it('should handle crypto errors gracefully', async () => {
      // Mock createHmac to throw an error
      const originalCreateHmac = require('crypto').createHmac;
      require('crypto').createHmac = jest.fn().mockImplementation(() => {
        throw new Error('Crypto error');
      });

      const params: HmacSignatureParams = {
        token: 'test-token',
        nonce: 'test-nonce',
      };

      expect(() => service.generateSignature(params)).toThrow('HMAC signature generation failed');

      // Restore original function
      require('crypto').createHmac = originalCreateHmac;
    });

    it('should handle validation errors gracefully', async () => {
      const validParams: HmacSignatureParams = {
        token: 'test-token',
        nonce: 'test-nonce',
      };
      
      // Mock generateSignature to throw an error during validation
      const originalGenerateSignature = service.generateSignature;
      service.generateSignature = jest.fn().mockImplementation(() => {
        throw new Error('Generation error during validation');
      });

      const result = await service.validateSignature('valid-signature', validParams);
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('HMAC signature validation error');

      // Restore original method
      service.generateSignature = originalGenerateSignature;
    });
  });
});
