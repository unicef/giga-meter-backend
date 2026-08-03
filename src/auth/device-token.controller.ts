import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  DeviceTokenService,
  TokenGenerationResponse,
} from './device-token.service';
import { Public } from '../common/public.decorator';

/**
 * DTO for device token generation request
 */
export class GenerateDeviceTokenDto {
  /**
   * Device hardware/BIOS serial identifier
   * @example "BIOS-SERIAL-123456"
   */
  hardwareId: string;

  /**
   * Device UUID identifier
   * @example "8afc0e86-1234-4bc9-93e1-22920c78b4a0"
   */
  uuid: string;
}

/**
 * DTO for device token generation response
 */
export class DeviceTokenResponseDto {
  token: string; // Generated encrypted token
  expiresAt: number; // Token expiration timestamp
  expiresIn: number; // Token expiration in milliseconds
  issuedAt: number; // Token issue timestamp
  hashId: string; // Derived SHA-256 device identifier
  success: boolean;
  message: string;
}

// Dynamic rate limit values from environment
const AUTH_RATE_LIMIT_MAX =
  parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 120;
const AUTH_RATE_LIMIT_TTL =
  (parseInt(process.env.AUTH_RATE_LIMIT_TTL, 10) || 60) * 1000;

@Controller('api/v1/auth')
@UseGuards(ThrottlerGuard)
export class DeviceTokenController {
  private readonly logger = new Logger(DeviceTokenController.name);

  constructor(private readonly deviceTokenService: DeviceTokenService) {}

  /**
   * Generates a secure token for device authentication
   */
  @Post('initialize')
  @Public()
  @Throttle({
    default: { limit: AUTH_RATE_LIMIT_MAX, ttl: AUTH_RATE_LIMIT_TTL },
  })
  @HttpCode(HttpStatus.OK)
  async generateToken(
    @Body() generateTokenDto: GenerateDeviceTokenDto,
  ): Promise<DeviceTokenResponseDto> {
    try {
      // Validate hardwareId
      if (!generateTokenDto.hardwareId) {
        throw new BadRequestException('Hardware ID is required');
      }

      const hardwareId = generateTokenDto.hardwareId.trim();
      if (hardwareId.length < 6) {
        throw new BadRequestException(
          'Hardware ID must be at least 6 characters long',
        );
      }

      // Validate uuid
      if (!generateTokenDto.uuid) {
        throw new BadRequestException('UUID is required');
      }

      const uuid = generateTokenDto.uuid.trim();
      if (uuid.length < 6) {
        throw new BadRequestException(
          'UUID must be at least 6 characters long',
        );
      }

      this.logger.log(
        `Generating token for device with hardwareId: ${hardwareId.substring(0, 8)}...`,
      );

      // Generate the token
      const tokenResponse: TokenGenerationResponse =
        await this.deviceTokenService.generateToken(hardwareId, uuid);

      const response: DeviceTokenResponseDto = {
        token: tokenResponse.token,
        expiresAt: tokenResponse.expiresAt,
        expiresIn: tokenResponse.expiresIn,
        issuedAt: tokenResponse.issuedAt,
        hashId: tokenResponse.hashId,
        success: true,
        message: 'Token generated successfully',
      };

      this.logger.log(
        `Successfully generated token for device: ${tokenResponse.hashId.substring(0, 8)}...`,
      );
      return response;
    } catch (error) {
      this.logger.error(`Token generation failed: ${error.message}`);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Failed to generate token');
    }
  }
}
