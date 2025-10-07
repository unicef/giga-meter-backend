import { 
  Controller, 
  Post, 
  Body, 
  HttpCode, 
  HttpStatus, 
  BadRequestException,
  Logger,
  UseGuards 
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { DeviceTokenService, TokenGenerationResponse } from './device-token.service';
import { Public } from '../common/public.decorator';

/**
 * DTO for device token generation request
 */
export class GenerateDeviceTokenDto {
  /**
   * Device fingerprint or UUIDv4 identifier
   * @example "550e8400-e29b-41d4-a716-446655440000"
   */
  deviceId: string;
}

/**
 * DTO for device token generation response
 */
export class DeviceTokenResponseDto {
  token: string; // Generated encrypted token
  expiresAt: number; //Token expiration timestamp
  expiresIn: number; //Token expiration in milliseconds
  issuedAt: number; //Token issue timestamp
  deviceId: string; //Hashed device identifier
  success: boolean;
  message: string;
}

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
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @HttpCode(HttpStatus.OK)
  async generateToken(
    @Body() generateTokenDto: GenerateDeviceTokenDto,
  ): Promise<DeviceTokenResponseDto> {
    try {
      // Validate input
      if (!generateTokenDto.deviceId) {
        throw new BadRequestException('Device ID is required');
      }

      // Validate device ID format (basic validation)
      const deviceId = generateTokenDto.deviceId.trim();
      if (deviceId.length < 6) {
        throw new BadRequestException('Device ID must be at least 6 characters long');
      }

      // Check if it's a valid UUID format (optional, but recommended)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const isValidUuid = uuidRegex.test(deviceId);
      
      if (!isValidUuid && deviceId.length < 16) {
        // Still allow non-UUID device IDs but log for monitoring
        this.logger.warn(`Received non-UUID device ID: ${deviceId}...`);
      }

      this.logger.log(`Generating token for device: ${deviceId}...`);

      // Generate the token
      const tokenResponse: TokenGenerationResponse = await this.deviceTokenService.generateToken(deviceId);

      const response: DeviceTokenResponseDto = {
        token: tokenResponse.token,
        expiresAt: tokenResponse.expiresAt,
        expiresIn: tokenResponse.expiresIn,
        issuedAt: tokenResponse.issuedAt,
        deviceId: tokenResponse.deviceId,
        success: true,
        message: 'Token generated successfully',
      };

      this.logger.log(`Successfully generated token for device: ${tokenResponse.deviceId.substring(0, 8)}...`);
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
