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
    it('should generate token successfully with valid hardwareId and uuid', async () => {
      const hardwareId = 'BIOS-SERIAL-123456';
      const uuid = '8afc0e86-1234-4bc9-93e1-22920c78b4a0';
      const mockResponse: TokenGenerationResponse = {
        token: 'generated-token-base64',
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        expiresIn: 24 * 60 * 60 * 1000,
        issuedAt: Date.now(),
        hashId: 'hashed-device-id',
      };

      mockDeviceTokenService.generateToken.mockResolvedValue(mockResponse);

      const dto: GenerateDeviceTokenDto = { hardwareId, uuid };
      const result = await controller.generateToken(dto);

      expect(result).toEqual({
        token: mockResponse.token,
        expiresAt: mockResponse.expiresAt,
        expiresIn: mockResponse.expiresIn,
        issuedAt: mockResponse.issuedAt,
        hashId: mockResponse.hashId,
        success: true,
        message: 'Token generated successfully',
      });
      expect(mockDeviceTokenService.generateToken).toHaveBeenCalledWith(hardwareId, uuid);
    });

    it('should throw BadRequestException when hardwareId is missing', async () => {
      const dto: GenerateDeviceTokenDto = { hardwareId: '', uuid: 'some-uuid' };

      await expect(controller.generateToken(dto)).rejects.toThrow(BadRequestException);
      await expect(controller.generateToken(dto)).rejects.toThrow('Hardware ID is required');
      expect(mockDeviceTokenService.generateToken).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when hardwareId is null', async () => {
      const dto: GenerateDeviceTokenDto = { hardwareId: null as any, uuid: 'some-uuid' };

      await expect(controller.generateToken(dto)).rejects.toThrow(BadRequestException);
      expect(mockDeviceTokenService.generateToken).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when hardwareId is too short', async () => {
      const dto: GenerateDeviceTokenDto = { hardwareId: '12345', uuid: 'some-uuid-value' };

      await expect(controller.generateToken(dto)).rejects.toThrow(BadRequestException);
      await expect(controller.generateToken(dto)).rejects.toThrow('Hardware ID must be at least 6 characters long');
      expect(mockDeviceTokenService.generateToken).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when uuid is missing', async () => {
      const dto: GenerateDeviceTokenDto = { hardwareId: 'BIOS-SERIAL-123456', uuid: '' };

      await expect(controller.generateToken(dto)).rejects.toThrow(BadRequestException);
      await expect(controller.generateToken(dto)).rejects.toThrow('UUID is required');
      expect(mockDeviceTokenService.generateToken).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when uuid is too short', async () => {
      const dto: GenerateDeviceTokenDto = { hardwareId: 'BIOS-SERIAL-123456', uuid: '12345' };

      await expect(controller.generateToken(dto)).rejects.toThrow(BadRequestException);
      await expect(controller.generateToken(dto)).rejects.toThrow('UUID must be at least 6 characters long');
      expect(mockDeviceTokenService.generateToken).not.toHaveBeenCalled();
    });

    it('should handle service errors gracefully', async () => {
      const hardwareId = 'BIOS-SERIAL-123456';
      const uuid = '8afc0e86-1234-4bc9-93e1-22920c78b4a0';
      mockDeviceTokenService.generateToken.mockRejectedValue(new Error('Service error'));

      const dto: GenerateDeviceTokenDto = { hardwareId, uuid };

      await expect(controller.generateToken(dto)).rejects.toThrow(BadRequestException);
      await expect(controller.generateToken(dto)).rejects.toThrow('Failed to generate token');
    });

    it('should trim whitespace from inputs', async () => {
      const hardwareId = '  BIOS-SERIAL-123456  ';
      const uuid = '  8afc0e86-1234-4bc9-93e1-22920c78b4a0  ';
      const mockResponse: TokenGenerationResponse = {
        token: 'generated-token-base64',
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        expiresIn: 24 * 60 * 60 * 1000,
        issuedAt: Date.now(),
        hashId: 'hashed-device-id',
      };

      mockDeviceTokenService.generateToken.mockResolvedValue(mockResponse);

      const dto: GenerateDeviceTokenDto = { hardwareId, uuid };
      await controller.generateToken(dto);

      expect(mockDeviceTokenService.generateToken).toHaveBeenCalledWith(
        'BIOS-SERIAL-123456',
        '8afc0e86-1234-4bc9-93e1-22920c78b4a0',
      );
    });
  });
});
