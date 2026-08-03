import { Injectable, Logger } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';


export interface HmacValidationResult {
  isValid: boolean;
  reason?: string;
}


export interface HmacSignatureParams {
  token: string;
  nonce: string;
}

/**
 * Service responsible for HMAC signature generation and validation
 * Provides message integrity and authenticity verification for device token requests
 *
 * HMAC payload format (per IRD §5.1): message = token + "|" + nonce
 * No timestamp validation is performed.
 */
@Injectable()
export class HmacSignatureService {
  private readonly logger = new Logger(HmacSignatureService.name);
  private readonly algorithm = 'sha256';

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
   * Generates HMAC signature for the given token and nonce
   * Message format: token + "|" + nonce
   * @returns Base64 encoded HMAC signature
   */
  generateSignature(params: HmacSignatureParams): string {
    try {
      const { token, nonce } = params;
      
      // Validate required parameters
      if (!token || !nonce) {
        throw new Error('Token and nonce are required for HMAC signature generation');
      }

      // Create the message to sign: token|nonce (no timestamp per IRD §5.1)
      const message = `${token}|${nonce}`;
      
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
   * Validates request payload integrity using HMAC
   * Extracts signature from X-HMAC-Signature header, recomputes using token|nonce
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

      // Validate signature (no timestamp — per IRD §5.1)
      return await this.validateSignature(signature, {
        token,
        nonce,
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
    secretConfigured: boolean;
  } {
    return {
      algorithm: this.algorithm,
      secretConfigured: !!process.env.DEVICE_TOKEN_HMAC_SECRET,
    };
  }
}
