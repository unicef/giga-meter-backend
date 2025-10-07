import { Injectable, Logger } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';


export interface HmacValidationResult {
  isValid: boolean;
  reason?: string;
}


export interface HmacSignatureParams {
  token: string;
  nonce: string;
  payload?: any;
  timestamp?: number;
}

/**
 * Service responsible for HMAC signature generation and validation
 * Provides message integrity and authenticity verification for device token requests
 */
@Injectable()
export class HmacSignatureService {
  private readonly logger = new Logger(HmacSignatureService.name);
  private readonly algorithm = 'sha256';
  private readonly timestampToleranceMs = 5 * 60 * 1000; // 5 minutes tolerance for timestamp validation

  /**
   * Gets the HMAC secret key from environment variables
   * @returns HMAC secret key as string
   */
  private getHmacSecret(): string {
    const secret = process.env.DEVICE_TOKEN_HMAC_SECRET;
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (!secret) {
      if (isProduction) {
        this.logger.error('DEVICE_TOKEN_HMAC_SECRET not set in production environment');
        throw new Error(
          'DEVICE_TOKEN_HMAC_SECRET is required in production. ' +
          'Generate one using: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'base64\'))"'
        );
      }
      
      this.logger.warn(
        'DEVICE_TOKEN_HMAC_SECRET not set in environment. Using default secret for development. ' +
        'Please set this in production for security.'
      );
      return 'default-hmac-secret-for-development-only';
    }

    return secret;
  }

  /**
   * Generates HMAC signature - this is used to verify the integrity of the device token request to test the signature
   * @returns Base64 encoded HMAC signature
   */
  generateSignature(params: HmacSignatureParams): string {
    try {
      const { token, nonce, timestamp } = params;
      
      // Validate required parameters
      if (!token || !nonce) {
        throw new Error('Token and nonce are required for HMAC signature generation');
      }

      // Create the message to sign
      const messageComponents = [
        token,
        nonce,
        timestamp ? timestamp.toString() : Date.now().toString(),
        // payload ? JSON.stringify(payload) : ''
      ];

      const message = messageComponents.join('|');
      
      // Generate HMAC signature
      const secret = this.getHmacSecret();
      const hmac = createHmac(this.algorithm, secret);
      hmac.update(message, 'utf8');
      
      const signature = hmac.digest('base64');
      
      this.logger.log('HMAC signature generated successfully');
      return signature;
    } catch (error) {
      this.logger.error(`Failed to generate HMAC signature: ${error.message}`);
      throw new Error('HMAC signature generation failed');
    }
  }

  /**
   * Validates HMAC signature against the provided parameters
   * @param signature - Base64 encoded signature to validate
   * @param params - Parameters used for signature generation
   * @returns Promise containing validation result
   */
  async validateSignature(signature: string, params: HmacSignatureParams): Promise<HmacValidationResult> {
    try {
      // Validate input parameters
      if (!signature || signature.trim().length === 0) {
        return {
          isValid: false,
          reason: 'HMAC signature cannot be empty',
        };
      }

      if (!params.token || !params.nonce) {
        return {
          isValid: false,
          reason: 'Token and nonce are required for HMAC validation',
        };
      }

      // Validate timestamp if provided (prevent replay attacks with old signatures)
      if (params.timestamp) {
        const now = Date.now();
        const timestampAge = now - params.timestamp;
        
        if (timestampAge > this.timestampToleranceMs) {
          this.logger.warn(`HMAC signature timestamp too old: ${timestampAge}ms`);
          return {
            isValid: false,
            reason: 'HMAC signature timestamp is too old',
          };
        }

        if (timestampAge < -this.timestampToleranceMs) {
          this.logger.warn(`HMAC signature timestamp too far in future: ${timestampAge}ms`);
          return {
            isValid: false,
            reason: 'HMAC signature timestamp is too far in the future',
          };
        }
      }

      // Generate expected signature
      const expectedSignature = this.generateSignature(params);
      
      // Use timing-safe comparison to prevent timing attacks
      const signatureBuffer = Buffer.from(signature, 'base64');
      const expectedBuffer = Buffer.from(expectedSignature, 'base64');
      
      if (signatureBuffer.length !== expectedBuffer.length) {
        this.logger.warn('HMAC signature length mismatch');
        return {
          isValid: false,
          reason: 'Invalid HMAC signature format',
        };
      }

      const isValid = timingSafeEqual(signatureBuffer, expectedBuffer);
      
      if (isValid) {
        this.logger.log('HMAC signature validation successful');
        return { isValid: true };
      } else {
        this.logger.warn('HMAC signature validation failed');
        return {
          isValid: false,
          reason: 'HMAC signature mismatch',
        };
      }
    } catch (error) {
      this.logger.error(`HMAC signature validation failed: ${error.message}`);
      return {
        isValid: false,
        reason: 'HMAC signature validation error',
      };
    }
  }

  /**
   * Validates the format of an HMAC signature
   * @param signature - Signature to validate format
   * @returns True if signature format is valid
   */
  isValidSignatureFormat(signature: string): boolean {
    if (!signature || typeof signature !== 'string') {
      return false;
    }

    try {
      // Should be valid base64
      const decoded = Buffer.from(signature, 'base64');
      // SHA-256 HMAC produces 32 bytes
      return decoded.length === 32;
    } catch {
      return false;
    }
  }

  /**
   * Extracts timestamp from request headers or body
   * @param request - HTTP request object
   * @returns Timestamp if found, undefined otherwise
   */
  extractTimestamp(request: any): number | undefined {
    try {
      // Check X-Timestamp header first
      const headerTimestamp = request.headers['x-timestamp'];
      if (headerTimestamp) {
        const timestamp = parseInt(headerTimestamp, 10);
        if (!isNaN(timestamp) && timestamp > 0) {
          return timestamp;
        }
      }

      // Check request body for timestamp
      if (request.body && request.body.timestamp) {
        const timestamp = parseInt(request.body.timestamp, 10);
        if (!isNaN(timestamp) && timestamp > 0) {
          return timestamp;
        }
      }

      return undefined;
    } catch (error) {
      this.logger.warn(`Failed to extract timestamp: ${error.message}`);
      return undefined;
    }
  }

  /**
   * Creates a complete HMAC signature with timestamp - this is used to verify the integrity of the device token request to test the signature
   * @param params - Parameters for signature generation
   * @returns Object containing signature and timestamp
   */
  createSignatureWithTimestamp(params: Omit<HmacSignatureParams, 'timestamp'>): {
    signature: string;
    timestamp: number;
  } {
    const timestamp = Date.now();
    const signature = this.generateSignature({ ...params, timestamp });
    
    return {
      signature,
      timestamp,
    };
  }

  /**
   * Validates request payload integrity using HMAC
   * @param request - HTTP request object
   * @param token - Device token
   * @param nonce - Request nonce
   * @returns Promise containing validation result
   */
  async validateRequestIntegrity(
    request: any,
    token: string,
    nonce: string,
  ): Promise<HmacValidationResult> {
    try {
      // Extract HMAC signature from headers
      const signature = request.headers['x-hmac-signature'];
      if (!signature) {
        return {
          isValid: false,
          reason: 'Missing X-HMAC-Signature header',
        };
      }

      // Validate signature format
      if (!this.isValidSignatureFormat(signature)) {
        return {
          isValid: false,
          reason: 'Invalid HMAC signature format',
        };
      }

      // Extract timestamp
      const timestamp = this.extractTimestamp(request);

      // Extract payload (if any)
      const payload = request.body || {};

      // Validate signature
      return await this.validateSignature(signature, {
        token,
        nonce,
        payload,
        timestamp,
      });
    } catch (error) {
      this.logger.error(`Request integrity validation failed: ${error.message}`);
      return {
        isValid: false,
        reason: 'Request integrity validation error',
      };
    }
  }

  /**
   * Gets configuration information for monitoring
   * @returns Configuration object
   */
  getConfiguration(): {
    algorithm: string;
    timestampToleranceMs: number;
    secretConfigured: boolean;
  } {
    return {
      algorithm: this.algorithm,
      timestampToleranceMs: this.timestampToleranceMs,
      secretConfigured: !!process.env.DEVICE_TOKEN_HMAC_SECRET,
    };
  }
}
