import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DeviceTokenController, GenerateDeviceTokenDto, DeviceTokenResponseDto } from './device-token.controller';
import { DeviceTokenService, TokenGenerationResponse } from './device-token.service';

describe('DeviceTokenController', () => {
  let controller: DeviceTokenController;
  let service: DeviceTokenService;

  const mockDeviceTokenService = {
    generateToken: jest.fn(),
    validateToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeviceTokenController],
      providers: [
        {
          provide: DeviceTokenService,
          useValue: mockDeviceTokenService,
        },
      ],
    }).compile();

    controller = module.get<DeviceTokenController>(DeviceTokenController);
    service = module.get<DeviceTokenService>(DeviceTokenService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateToken', () => {
    it('should generate token successfully with valid UUID', async () => {
      const deviceId = '550e8400-e29b-41d4-a716-446655440000';
      const mockResponse: TokenGenerationResponse = {
        token: 'generated-token-base64',
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        deviceId: 'hashed-device-id',
      };

      mockDeviceTokenService.generateToken.mockResolvedValue(mockResponse);

      const dto: GenerateDeviceTokenDto = { deviceId };
      const result = await controller.generateToken(dto);

      expect(result).toEqual({
        token: mockResponse.token,
        expiresAt: mockResponse.expiresAt,
        deviceId: mockResponse.deviceId,
        success: true,
        message: 'Token generated successfully',
      });
      expect(mockDeviceTokenService.generateToken).toHaveBeenCalledWith(deviceId);
    });

    it('should generate token successfully with non-UUID device ID', async () => {
      const deviceId = 'device-fingerprint-12345678';
      const mockResponse: TokenGenerationResponse = {
        token: 'generated-token-base64',
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        deviceId: 'hashed-device-id',
      };

      mockDeviceTokenService.generateToken.mockResolvedValue(mockResponse);

      const dto: GenerateDeviceTokenDto = { deviceId };
      const result = await controller.generateToken(dto);

      expect(result.success).toBe(true);
      expect(result.token).toBe(mockResponse.token);
      expect(mockDeviceTokenService.generateToken).toHaveBeenCalledWith(deviceId);
    });

    it('should throw BadRequestException when deviceId is missing', async () => {
      const dto: GenerateDeviceTokenDto = { deviceId: '' };

      await expect(controller.generateToken(dto)).rejects.toThrow(BadRequestException);
      await expect(controller.generateToken(dto)).rejects.toThrow('Device ID is required');
      expect(mockDeviceTokenService.generateToken).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when deviceId is null', async () => {
      const dto: GenerateDeviceTokenDto = { deviceId: null as any };

      await expect(controller.generateToken(dto)).rejects.toThrow(BadRequestException);
      expect(mockDeviceTokenService.generateToken).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when deviceId is too short', async () => {
      const dto: GenerateDeviceTokenDto = { deviceId: '1234567' }; // 7 characters

      await expect(controller.generateToken(dto)).rejects.toThrow(BadRequestException);
      await expect(controller.generateToken(dto)).rejects.toThrow('Device ID must be at least 8 characters long');
      expect(mockDeviceTokenService.generateToken).not.toHaveBeenCalled();
    });

    it('should handle service errors gracefully', async () => {
      const deviceId = '550e8400-e29b-41d4-a716-446655440000';
      mockDeviceTokenService.generateToken.mockRejectedValue(new Error('Service error'));

      const dto: GenerateDeviceTokenDto = { deviceId };

      await expect(controller.generateToken(dto)).rejects.toThrow(BadRequestException);
      await expect(controller.generateToken(dto)).rejects.toThrow('Failed to generate token');
    });

    it('should trim whitespace from deviceId', async () => {
      const deviceId = '  550e8400-e29b-41d4-a716-446655440000  ';
      const trimmedDeviceId = '550e8400-e29b-41d4-a716-446655440000';
      const mockResponse: TokenGenerationResponse = {
        token: 'generated-token-base64',
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        deviceId: 'hashed-device-id',
      };

      mockDeviceTokenService.generateToken.mockResolvedValue(mockResponse);

      const dto: GenerateDeviceTokenDto = { deviceId };
      await controller.generateToken(dto);

      expect(mockDeviceTokenService.generateToken).toHaveBeenCalledWith(trimmedDeviceId);
    });
  });

  describe('validateToken', () => {
    it('should validate token successfully', async () => {
      const token = 'valid-token-base64';
      const mockPayload = {
        deviceId: 'hashed-device-id',
        timestamp: Date.now() - 1000,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      };

      mockDeviceTokenService.validateToken.mockResolvedValue(mockPayload);

      const result = await controller.validateToken({ token });

      expect(result).toEqual({
        valid: true,
        payload: {
          deviceId: mockPayload.deviceId,
          timestamp: mockPayload.timestamp,
          expiresAt: mockPayload.expiresAt,
        },
        message: 'Token is valid',
      });
      expect(mockDeviceTokenService.validateToken).toHaveBeenCalledWith(token);
    });

    it('should return invalid for expired/invalid token', async () => {
      const token = 'invalid-token';
      mockDeviceTokenService.validateToken.mockResolvedValue(null);

      const result = await controller.validateToken({ token });

      expect(result).toEqual({
        valid: false,
        message: 'Token is invalid or expired',
      });
      expect(mockDeviceTokenService.validateToken).toHaveBeenCalledWith(token);
    });

    it('should return invalid when token is missing', async () => {
      const result = await controller.validateToken({ token: '' });

      expect(result).toEqual({
        valid: false,
        message: 'Token is required',
      });
      expect(mockDeviceTokenService.validateToken).not.toHaveBeenCalled();
    });

    it('should handle service errors gracefully', async () => {
      const token = 'some-token';
      mockDeviceTokenService.validateToken.mockRejectedValue(new Error('Service error'));

      const result = await controller.validateToken({ token });

      expect(result).toEqual({
        valid: false,
        message: 'Token validation failed',
      });
    });
  });

  describe('UUID validation', () => {
    it('should accept valid UUID v4', async () => {
      const deviceId = '550e8400-e29b-41d4-a716-446655440000';
      const mockResponse: TokenGenerationResponse = {
        token: 'generated-token-base64',
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        deviceId: 'hashed-device-id',
      };

      mockDeviceTokenService.generateToken.mockResolvedValue(mockResponse);

      const dto: GenerateDeviceTokenDto = { deviceId };
      const result = await controller.generateToken(dto);

      expect(result.success).toBe(true);
    });

    it('should accept valid UUID v1', async () => {
      const deviceId = '550e8400-e29b-11d4-a716-446655440000';
      const mockResponse: TokenGenerationResponse = {
        token: 'generated-token-base64',
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        deviceId: 'hashed-device-id',
      };

      mockDeviceTokenService.generateToken.mockResolvedValue(mockResponse);

      const dto: GenerateDeviceTokenDto = { deviceId };
      const result = await controller.generateToken(dto);

      expect(result.success).toBe(true);
    });

    it('should accept long non-UUID device fingerprints', async () => {
      const deviceId = 'device-fingerprint-with-long-identifier-123456789';
      const mockResponse: TokenGenerationResponse = {
        token: 'generated-token-base64',
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        deviceId: 'hashed-device-id',
      };

      mockDeviceTokenService.generateToken.mockResolvedValue(mockResponse);

      const dto: GenerateDeviceTokenDto = { deviceId };
      const result = await controller.generateToken(dto);

      expect(result.success).toBe(true);
    });
  });
});
