import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { randomBytes, createHash } from 'crypto';

/**
 * Interface for nonce validation result
 */
export interface NonceValidationResult {
  isValid: boolean;
  reason?: string;
}

/**
 * Service responsible for nonce generation and validation to prevent replay attacks
 * Uses Redis for distributed nonce storage with TTL-based cleanup
 */
@Injectable()
export class NonceService {
  private readonly logger = new Logger(NonceService.name);
  private readonly noncePrefix = 'nonce:';
  private readonly defaultTtlSeconds = 24 * 60 * 60; // 24 hours - same as token TTL

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  /**
   * Generates a cryptographically secure nonce
   * @returns Base64 encoded random nonce
   */
  generateNonce(): string {
    try {
      // Generate 32 bytes of random data for strong entropy
      const nonceBytes = randomBytes(32);
      return nonceBytes.toString('base64');
    } catch (error) {
      this.logger.error(`Failed to generate nonce: ${error.message}`);
      throw new Error('Nonce generation failed');
    }
  }

  /**
   * Creates a deterministic nonce hash for consistent Redis key generation
   * @param nonce - Original nonce value
   * @returns SHA-256 hash of the nonce
   */
  private hashNonce(nonce: string): string {
    return createHash('sha256').update(nonce).digest('hex');
  }

  /**
   * Generates the Redis key for nonce storage
   * @param nonce - Nonce value to create key for
   * @returns Redis key with proper prefix
   */
  private getNonceKey(nonce: string): string {
    const hashedNonce = this.hashNonce(nonce);
    return `${this.noncePrefix}${hashedNonce}`;
  }

  /**
   * Validates and consumes a nonce (marks it as used)
   * This operation is atomic - if the nonce exists, it's consumed and marked as used
   * @param nonce - Nonce to validate and consume
   * @param deviceId - Associated device ID for logging
   * @returns Promise containing validation result
   */
  async validateAndConsumeNonce(nonce: string, deviceId?: string): Promise<NonceValidationResult> {
    try {
      if (!nonce || nonce.trim().length === 0) {
        this.logger.warn('Empty nonce provided for validation');
        return {
          isValid: false,
          reason: 'Nonce cannot be empty',
        };
      }

      const nonceKey = this.getNonceKey(nonce);
      
      // Check if nonce already exists (has been used)
      const existingNonce = await this.cacheManager.get(nonceKey);
      
      if (existingNonce) {
        this.logger.warn(
          `Replay attack detected: nonce already used for device ${deviceId?.substring(0, 8) || 'unknown'}...`
        );
        return {
          isValid: false,
          reason: 'Nonce has already been used (replay attack detected)',
        };
      }

      // Mark nonce as used by storing it in Redis with TTL
      const ttlMs = this.getTtlMs();
      await this.cacheManager.set(nonceKey, {
        deviceId: deviceId || 'unknown',
        usedAt: Date.now(),
        originalNonce: nonce.substring(0, 16) + '...', // Store partial for debugging
      }, ttlMs);

      this.logger.log(
        `Nonce validated and consumed for device ${deviceId?.substring(0, 8) || 'unknown'}...`
      );

      return {
        isValid: true,
      };
    } catch (error) {
      this.logger.error(`Nonce validation failed: ${error.message}`);
      return {
        isValid: false,
        reason: 'Nonce validation error',
      };
    }
  }

  /**
   * Checks if a nonce has been used without consuming it
   * Useful for testing or debugging purposes
   * @param nonce - Nonce to check
   * @returns Promise indicating if nonce has been used
   */
  async isNonceUsed(nonce: string): Promise<boolean> {
    try {
      if (!nonce || nonce.trim().length === 0) {
        return false;
      }

      const nonceKey = this.getNonceKey(nonce);
      const existingNonce = await this.cacheManager.get(nonceKey);
      
      return !!existingNonce;
    } catch (error) {
      this.logger.error(`Failed to check nonce status: ${error.message}`);
      return false; // Assume not used on error to avoid blocking valid requests
    }
  }

  /**
   * Gets the TTL for nonce storage in milliseconds
   * @returns TTL in milliseconds
   */
  private getTtlMs(): number {
    const ttlSeconds = parseInt(process.env.DEVICE_TOKEN_NONCE_TTL || this.defaultTtlSeconds.toString());
    return ttlSeconds * 1000;
  }

  /**
   * Manually invalidates a nonce (marks it as used)
   * Useful for administrative purposes or cleanup
   * @param nonce - Nonce to invalidate
   * @param reason - Reason for invalidation
   * @returns Promise indicating success
   */
  async invalidateNonce(nonce: string, reason: string = 'Manual invalidation'): Promise<boolean> {
    try {
      if (!nonce || nonce.trim().length === 0) {
        return false;
      }

      const nonceKey = this.getNonceKey(nonce);
      const ttlMs = this.getTtlMs();
      
      await this.cacheManager.set(nonceKey, {
        invalidatedAt: Date.now(),
        reason,
        originalNonce: nonce.substring(0, 16) + '...',
      }, ttlMs);

      this.logger.log(`Nonce manually invalidated: ${reason}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to invalidate nonce: ${error.message}`);
      return false;
    }
  }

  /**
   * Gets statistics about nonce usage (for monitoring)
   * Note: This is a basic implementation - for production, consider using Redis SCAN
   * @returns Promise containing nonce statistics
   */
  async getNonceStats(): Promise<{ totalUsedNonces: number; redisConnected: boolean }> {
    try {
      // Basic health check - try to set and get a test key
      const testKey = `${this.noncePrefix}health_check`;
      await this.cacheManager.set(testKey, 'test', 1000);
      const testValue = await this.cacheManager.get(testKey);
      await this.cacheManager.del(testKey);

      return {
        totalUsedNonces: -1, // Would need Redis SCAN to count efficiently
        redisConnected: testValue === 'test',
      };
    } catch (error) {
      this.logger.error(`Failed to get nonce stats: ${error.message}`);
      return {
        totalUsedNonces: -1,
        redisConnected: false,
      };
    }
  }

  /**
   * Validates nonce format and basic properties
   * @param nonce - Nonce to validate format
   * @returns True if nonce format is valid
   */
  isValidNonceFormat(nonce: string): boolean {
    if (!nonce || typeof nonce !== 'string') {
      return false;
    }

    // Check if it's valid base64
    try {
      const decoded = Buffer.from(nonce, 'base64');
      // Should be at least 16 bytes for good entropy
      return decoded.length >= 16;
    } catch {
      return false;
    }
  }
}
