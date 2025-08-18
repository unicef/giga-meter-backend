import { 
  Controller, 
  Post, 
  Body, 
  HttpCode, 
  HttpStatus, 
  BadRequestException,
  Logger 
} from '@nestjs/common';
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
  /**
   * Generated encrypted token
   */
  token: string;

  /**
   * Token expiration timestamp
   */
  expiresAt: number;

  /**
   * Hashed device identifier
   */
  deviceId: string;

  /**
   * Success status
   */
  success: boolean;

  /**
   * Response message
   */
  message: string;
}

/**
 * Controller responsible for device token generation endpoints
 * Provides secure token generation for device-based authentication
 */
@Controller('api/v1/auth')
export class DeviceTokenController {
  private readonly logger = new Logger(DeviceTokenController.name);

  constructor(private readonly deviceTokenService: DeviceTokenService) {}

  /**
   * Generates a secure token for device authentication
   * @param generateTokenDto - Contains device fingerprint or UUID
   * @returns Promise containing the generated token and metadata
   */
  @Post('initialize')
  @Public() // This endpoint should be public to allow initial token generation
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
      if (deviceId.length < 8) {
        throw new BadRequestException('Device ID must be at least 8 characters long');
      }

      // Check if it's a valid UUID format (optional, but recommended)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const isValidUuid = uuidRegex.test(deviceId);
      
      if (!isValidUuid && deviceId.length < 16) {
        this.logger.warn(`Received non-UUID device ID: ${deviceId.substring(0, 8)}...`);
        // Still allow non-UUID device IDs but log for monitoring
      }

      this.logger.log(`Generating token for device: ${deviceId.substring(0, 8)}...`);

      // Generate the token
      const tokenResponse: TokenGenerationResponse = await this.deviceTokenService.generateToken(deviceId);

      // Return formatted response
      const response: DeviceTokenResponseDto = {
        token: tokenResponse.token,
        expiresAt: tokenResponse.expiresAt,
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

      // Return generic error for security
      throw new BadRequestException('Failed to generate token');
    }
  }

  /**
   * Validates a device token (for testing purposes)
   * In production, token validation should be handled by the auth guard
   * @param body - Contains token to validate
   * @returns Promise containing validation result
   */
  @Post('validate')
  @Public() // Public for testing, remove in production or add proper auth
  @HttpCode(HttpStatus.OK)
  async validateToken(
    @Body() body: { token: string },
  ): Promise<{ valid: boolean; payload?: any; message: string }> {
    try {
      if (!body.token) {
        return {
          valid: false,
          message: 'Token is required',
        };
      }

      const payload = await this.deviceTokenService.validateToken(body.token);
      
      if (payload) {
        return {
          valid: true,
          payload: {
            deviceId: payload.deviceId,
            timestamp: payload.timestamp,
            expiresAt: payload.expiresAt,
          },
          message: 'Token is valid',
        };
      } else {
        return {
          valid: false,
          message: 'Token is invalid or expired',
        };
      }
    } catch (error) {
      this.logger.error(`Token validation failed: ${error.message}`);
      return {
        valid: false,
        message: 'Token validation failed',
      };
    }
  }
}
