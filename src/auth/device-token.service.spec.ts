import { Test, TestingModule } from '@nestjs/testing';
import { DeviceTokenService, DeviceTokenPayload } from './device-token.service';
import { Logger } from '@nestjs/common';

describe('DeviceTokenService', () => {
  let service: DeviceTokenService;
  const originalEnv = process.env;

  beforeEach(async () => {
    // Reset environment variables
    process.env = { ...originalEnv };
    process.env.DEVICE_TOKEN_MASTER_KEY = 'YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY='; // base64 encoded 32-byte key

    const module: TestingModule = await Test.createTestingModule({
      providers: [DeviceTokenService],
    }).compile();

    service = module.get<DeviceTokenService>(DeviceTokenService);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('generateToken', () => {
    it('should generate a valid token for hardwareId and uuid', async () => {
      const hardwareId = 'BIOS-SERIAL-123456';
      const uuid = '8afc0e86-1234-4bc9-93e1-22920c78b4a0';
      
      const result = await service.generateToken(hardwareId, uuid);
      
      expect(result).toBeDefined();
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
      expect(result.expiresAt).toBeGreaterThan(Date.now());
      expect(result.hashId).toBeDefined();
      expect(result.hashId).toHaveLength(64); // SHA256 hash length
    });

    it('should generate different tokens for different device identifiers', async () => {
      const hardwareId1 = 'BIOS-SERIAL-123456';
      const uuid1 = '8afc0e86-1234-4bc9-93e1-22920c78b4a0';
      const hardwareId2 = 'BIOS-SERIAL-654321';
      const uuid2 = '8afc0e86-1234-4bc9-93e1-22920c78b4a1';
      
      const result1 = await service.generateToken(hardwareId1, uuid1);
      const result2 = await service.generateToken(hardwareId2, uuid2);
      
      expect(result1.token).not.toBe(result2.token);
      expect(result1.hashId).not.toBe(result2.hashId);
    });

    it('should generate the same hashId for the same hardwareId+uuid', async () => {
      const hardwareId = 'BIOS-SERIAL-123456';
      const uuid = '8afc0e86-1234-4bc9-93e1-22920c78b4a0';
      
      const result1 = await service.generateToken(hardwareId, uuid);
      const result2 = await service.generateToken(hardwareId, uuid);
      
      expect(result1.hashId).toBe(result2.hashId);
    });

    it('should throw error for empty hardwareId', async () => {
      await expect(service.generateToken('', 'some-uuid')).rejects.toThrow('Token generation failed');
      await expect(service.generateToken('   ', 'some-uuid')).rejects.toThrow('Token generation failed');
    });

    it('should throw error for empty uuid', async () => {
      await expect(service.generateToken('some-hwid', '')).rejects.toThrow('Token generation failed');
      await expect(service.generateToken('some-hwid', '   ')).rejects.toThrow('Token generation failed');
    });

    it('should throw error for null/undefined inputs', async () => {
      await expect(service.generateToken(null as any, 'uuid')).rejects.toThrow('Token generation failed');
      await expect(service.generateToken('hwid', null as any)).rejects.toThrow('Token generation failed');
    });
  });

  describe('validateToken', () => {
    it('should validate a valid token', async () => {
      const hardwareId = 'BIOS-SERIAL-123456';
      const uuid = '8afc0e86-1234-4bc9-93e1-22920c78b4a0';
      
      const generated = await service.generateToken(hardwareId, uuid);
      const payload = await service.validateToken(generated.token);
      
      expect(payload).toBeDefined();
      expect(payload!.hashId).toBe(generated.hashId);
      expect(payload!.timestamp).toBeLessThanOrEqual(Date.now());
      expect(payload!.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should return null for invalid token', async () => {
      const invalidToken = 'invalid-token';
      
      const payload = await service.validateToken(invalidToken);
      
      expect(payload).toBeNull();
    });

    it('should return null for empty token', async () => {
      const payload1 = await service.validateToken('');
      const payload2 = await service.validateToken('   ');
      
      expect(payload1).toBeNull();
      expect(payload2).toBeNull();
    });

    it('should return null for malformed base64 token', async () => {
      const malformedToken = 'not-base64!@#$%';
      
      const payload = await service.validateToken(malformedToken);
      
      expect(payload).toBeNull();
    });

    it('should return null for token with wrong key', async () => {
      const hardwareId = 'BIOS-SERIAL-123456';
      const uuid = '8afc0e86-1234-4bc9-93e1-22920c78b4a0';
      
      // Generate token with one key
      const generated = await service.generateToken(hardwareId, uuid);
      
      // Change the key and try to validate
      process.env.DEVICE_TOKEN_MASTER_KEY = 'ZGlmZmVyZW50a2V5Zm9ydGVzdGluZzEyMzQ1Njc4OTA=';
      
      const payload = await service.validateToken(generated.token);
      
      expect(payload).toBeNull();
    });
  });

  describe('isDeviceToken', () => {
    it('should identify device tokens correctly', async () => {
      const hardwareId = 'BIOS-SERIAL-123456';
      const uuid = '8afc0e86-1234-4bc9-93e1-22920c78b4a0';
      const generated = await service.generateToken(hardwareId, uuid);
      
      expect(service.isDeviceToken(generated.token)).toBe(true);
    });

    it('should reject JWT-like tokens', () => {
      const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      
      expect(service.isDeviceToken(jwtToken)).toBe(false);
    });

    it('should reject short tokens', () => {
      const shortToken = 'c2hvcnQ='; // "short" in base64
      
      expect(service.isDeviceToken(shortToken)).toBe(false);
    });

    it('should reject null/undefined tokens', () => {
      expect(service.isDeviceToken(null as any)).toBe(false);
      expect(service.isDeviceToken(undefined as any)).toBe(false);
      expect(service.isDeviceToken('')).toBe(false);
    });
  });

  describe('validateTokenForDevice', () => {
    it('should validate token for correct device', async () => {
      const hardwareId = 'BIOS-SERIAL-123456';
      const uuid = '8afc0e86-1234-4bc9-93e1-22920c78b4a0';
      
      const generated = await service.generateToken(hardwareId, uuid);
      const isValid = await service.validateTokenForDevice(generated.token, hardwareId, uuid);
      
      expect(isValid).toBe(true);
    });

    it('should reject token for different device', async () => {
      const hardwareId1 = 'BIOS-SERIAL-123456';
      const uuid1 = '8afc0e86-1234-4bc9-93e1-22920c78b4a0';
      const hardwareId2 = 'BIOS-SERIAL-654321';
      const uuid2 = '8afc0e86-1234-4bc9-93e1-22920c78b4a1';
      
      const generated = await service.generateToken(hardwareId1, uuid1);
      const isValid = await service.validateTokenForDevice(generated.token, hardwareId2, uuid2);
      
      expect(isValid).toBe(false);
    });

    it('should reject invalid token', async () => {
      const invalidToken = 'invalid-token';
      
      const isValid = await service.validateTokenForDevice(invalidToken, 'hwid', 'uuid');
      
      expect(isValid).toBe(false);
    });
  });

  describe('environment handling', () => {
    it('should warn when master key is not set', async () => {
      delete process.env.DEVICE_TOKEN_MASTER_KEY;
      
      const loggerSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
      
      const hardwareId = 'BIOS-SERIAL-123456';
      const uuid = '8afc0e86-1234-4bc9-93e1-22920c78b4a0';
      await service.generateToken(hardwareId, uuid);
      
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('DEVICE_TOKEN_MASTER_KEY not set in environment')
      );
      
      loggerSpy.mockRestore();
    });
  });

  describe('token expiration', () => {
    it('should reject expired tokens', async () => {
      // Mock Date.now to simulate token generation in the past
      const originalDateNow = Date.now;
      const pastTime = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
      
      Date.now = jest.fn(() => pastTime);
      
      const hardwareId = 'BIOS-SERIAL-123456';
      const uuid = '8afc0e86-1234-4bc9-93e1-22920c78b4a0';
      const generated = await service.generateToken(hardwareId, uuid);
      
      // Restore Date.now to current time
      Date.now = originalDateNow;
      
      const payload = await service.validateToken(generated.token);
      
      expect(payload).toBeNull();
    });
  });
});
