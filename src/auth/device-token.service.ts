import { Injectable, Logger } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

export interface DeviceTokenPayload {
  deviceId: string;
  timestamp: number;
  expiresAt: number;
}

export interface TokenGenerationResponse {
  token: string;
  expiresAt: number;
  expiresIn: number;
  issuedAt: number;
  deviceId: string;
}

/**
 * Service responsible for generating and validating device-based tokens
 * Uses AES-256-GCM encryption for secure token generation
 */
@Injectable()
export class DeviceTokenService {
  private readonly logger = new Logger(DeviceTokenService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 32 bytes for AES-256
  private readonly ivLength = 16; // 16 bytes for GCM IV
  private readonly tagLength = 16; // 16 bytes for GCM auth tag
  private readonly tokenTtlHours = 0.05; // Token valid for 24 hours

  /**
   * Generates a secure encryption key - Base64 encoded 32-byte random key
   */
  private generateEncryptionKey(): string {
    const key = randomBytes(this.keyLength);
    return key.toString('base64');
  }

  /**
   * Gets or generates the master encryption key from environment - Buffer containing the encryption key
   */
  private getMasterKey(): Buffer {
    let masterKey = process.env.DEVICE_TOKEN_MASTER_KEY;
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (!masterKey) {
      if (isProduction) {
        this.logger.error('DEVICE_TOKEN_MASTER_KEY not set in production environment');
        throw new Error(
          'DEVICE_TOKEN_MASTER_KEY is required in production. ' +
          'Generate one using: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
        );
      }
      // Generate a new key if not set (for development only)
      masterKey = this.generateEncryptionKey();
      this.logger.warn(
        'DEVICE_TOKEN_MASTER_KEY not set in environment. Generated temporary key. ' +
        'Please set this in production: ' + masterKey
      );
    }

    return Buffer.from(masterKey, 'base64');
  }

  /**
   * Creates a hash of the device identifier for consistent token generation
   * @param deviceId - Device fingerprint or UUID
   * @returns Hashed device identifier
   */
  private hashDeviceId(deviceId: string): string {
    return createHash('sha256').update(deviceId).digest('hex');
  }

  /**
   * Generates a secure token for the given device identifier
   * @param deviceId - Device fingerprint or UUIDv4
   * @returns Promise containing token generation response
   */
  async generateToken(deviceId: string): Promise<TokenGenerationResponse> {
    try {
      if (!deviceId || deviceId.trim().length === 0) {
        throw new Error('Device ID cannot be empty');
      }

      const now = Date.now();
      const expiresAt = now + (this.tokenTtlHours * 60 * 60 * 1000);
      const hashedDeviceId = this.hashDeviceId(deviceId);

      // Create payload
      const payload: DeviceTokenPayload = {
        deviceId: hashedDeviceId,
        timestamp: now,
        expiresAt,
      };

      // Generate random IV for this token
      const iv = randomBytes(this.ivLength);
      const key = this.getMasterKey();

      // Create cipher
      const cipher = createCipheriv(this.algorithm, key, iv);
      
      // Encrypt the payload
      const payloadString = JSON.stringify(payload);
      let encrypted = cipher.update(payloadString, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      // Get authentication tag
      const tag = cipher.getAuthTag();

      // Combine IV, tag, and encrypted data
      const tokenData = Buffer.concat([
        iv,
        tag,
        Buffer.from(encrypted, 'base64')
      ]);

      const token = tokenData.toString('base64');

      this.logger.log(`Generated token for device: ${hashedDeviceId.substring(0, 8)}...`);

      return {
        token,
        expiresAt,
        expiresIn: this.tokenTtlHours * 60 * 60 * 1000,
        issuedAt: now,
        deviceId: hashedDeviceId,
      };
    } catch (error) {
      this.logger.error(`Failed to generate token: ${error.message}`);
      throw new Error('Token generation failed');
    }
  }

  /**
   * Validates a device token and extracts payload
   * @param token - Base64 encoded encrypted token
   * @returns Promise containing the decrypted payload or null if invalid
   */
  async validateToken(token: string): Promise<DeviceTokenPayload | null> {
    try {
      if (!token || token.trim().length === 0) {
        return null;
      }

      const key = this.getMasterKey();
      const tokenBuffer = Buffer.from(token, 'base64');

      // Extract IV, tag, and encrypted data
      if (tokenBuffer.length < this.ivLength + this.tagLength) {
        this.logger.warn('Token too short to be valid');
        return null;
      }

      const iv = tokenBuffer.subarray(0, this.ivLength);
      const tag = tokenBuffer.subarray(this.ivLength, this.ivLength + this.tagLength);
      const encryptedData = tokenBuffer.subarray(this.ivLength + this.tagLength);

      // Create decipher
      const decipher = createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(tag);

      // Decrypt the data
      let decrypted = decipher.update(encryptedData, undefined, 'utf8');
      decrypted += decipher.final('utf8');

      // Parse payload
      const payload: DeviceTokenPayload = JSON.parse(decrypted);

      // Validate payload structure
      if (!payload.deviceId || !payload.timestamp || !payload.expiresAt) {
        this.logger.warn('Invalid payload structure');
        return null;
      }

      // Check if token has expired
      if (Date.now() > payload.expiresAt) {
        this.logger.warn(`Token expired for device: ${payload.deviceId.substring(0, 8)}...`);
        return null;
      }

      this.logger.log(`Validated token for device: ${payload.deviceId.substring(0, 8)}...`);
      return payload;
    } catch (error) {
      this.logger.warn(`Token validation failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Checks if a token string appears to be a device token
   * Device tokens are base64 encoded and longer
   * @param token - Token string to check
   * @returns True if token appears to be a device token
   */
  isDeviceToken(token: string): boolean {
    if (!token) return false;
    
    try {
      // Device tokens should be base64 encoded
      const decoded = Buffer.from(token, 'base64');
      
      // Should be at least IV + tag + some encrypted data
      const minLength = this.ivLength + this.tagLength + 32;
      
      // Device tokens don't contain dots (unlike JWTs)
      return decoded.length >= minLength && !token.includes('.');
    } catch {
      return false;
    }
  }

  /**
   * Validates a device token against a specific device ID
   * @param token - Token to validate
   * @param deviceId - Expected device ID
   * @returns Promise - true / false
   */
  async validateTokenForDevice(token: string, deviceId: string): Promise<boolean> {
    try {
      const payload = await this.validateToken(token);
      if (!payload) return false;

      const hashedDeviceId = this.hashDeviceId(deviceId);
      return payload.deviceId === hashedDeviceId;
    } catch (error) {
      this.logger.error(`Device token validation failed: ${error.message}`);
      return false;
    }
  }
}
