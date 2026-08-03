import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';

export interface NonceValidationResult {
  isValid: boolean;
  reason?: string;
}

/**
 * Service responsible for nonce generation and validation to prevent replay attacks.
 * Uses Redis for distributed nonce storage with TTL-based cleanup.
 * Falls back to SQL database (Prisma) when Redis is unavailable (per IRD §4.1).
 */
@Injectable()
export class NonceService {
  private readonly logger = new Logger(NonceService.name);
  private readonly noncePrefix = 'nonce:';
  private readonly defaultTtlSeconds = 2 * 60 * 60; // 2 hours

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Generates a cryptographically secure nonce - this is only to test the nonce validation
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
   * Creates a deterministic nonce hash for consistent Redis key generation - this is only to test the nonce validation
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
   * Checks if Redis is available by performing a lightweight operation
   * @returns true if Redis responds, false otherwise
   */
  private async isRedisAvailable(): Promise<boolean> {
    try {
      const testKey = `${this.noncePrefix}__appsecurity__`;
      await this.cacheManager.set(testKey, '1', 1000);
      await this.cacheManager.del(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validates and consumes a nonce (marks it as used).
   * Uses Redis as the fast path; falls back to the SQL Nonce table if Redis is unavailable.
   *
   * Flow (per IRD §4.1):
   *   1. Check Redis availability
   *   2a. Redis available → read from Redis; if unused, write to Redis AND DB
   *   2b. Redis unavailable → read from DB; if unused, write to DB only
   *
   * @param nonce - Nonce to validate and consume
   * @param hashId - Associated device hash ID for logging and DB storage
   * @returns Promise containing validation result
   */
  async validateAndConsumeNonce(
    nonce: string,
    hashId?: string,
  ): Promise<NonceValidationResult> {
    try {
      if (!nonce || nonce.trim().length === 0) {
        this.logger.warn('Empty nonce provided for validation');
        return {
          isValid: false,
          reason: 'Nonce cannot be empty',
        };
      }

      const redisAvailable = await this.isRedisAvailable();

      if (redisAvailable) {
        return await this.validateViaRedis(nonce, hashId);
      } else {
        this.logger.warn(
          'Redis unavailable — falling back to database for nonce validation',
        );
        return await this.validateViaDatabase(nonce, hashId);
      }
    } catch (error) {
      this.logger.error(`Nonce validation failed: ${error.message}`);
      return {
        isValid: false,
        reason: 'Nonce validation error',
      };
    }
  }

  /**
   * Redis fast-path: check and consume nonce via cache, then dual-write to DB
   */
  private async validateViaRedis(
    nonce: string,
    hashId?: string,
  ): Promise<NonceValidationResult> {
    const nonceKey = this.getNonceKey(nonce);

    // Check if nonce already exists in Redis (has been used)
    const existingNonce = await this.cacheManager.get(nonceKey);

    if (existingNonce) {
      this.logger.warn(
        `Replay attack detected: nonce already used for device ${hashId?.substring(0, 8) || 'unknown'}...`,
      );
      return {
        isValid: false,
        reason: 'Nonce has already been used (replay attack detected)',
      };
    }

    // Mark nonce as used in Redis with TTL
    const ttlMs = this.getTtlMs();
    await this.cacheManager.set(
      nonceKey,
      {
        hashId: hashId || 'unknown',
        usedAt: Date.now(),
        originalNonce: nonce,
      },
      ttlMs,
    );

    // Dual-write to DB for resilience
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + ttlMs);
      await this.prisma.nonce.create({
        data: {
          original_nonce: this.hashNonce(nonce),
          hash_id: hashId || 'unknown',
          used_at: now,
          expires_at: expiresAt,
        },
      });
    } catch (dbError) {
      // Log but don't fail — Redis is the primary store
      this.logger.warn(`Failed to dual-write nonce to DB: ${dbError.message}`);
    }

    this.logger.log(
      `Nonce validated and consumed (Redis) for device ${hashId?.substring(0, 8) || 'unknown'}...`,
    );

    return { isValid: true };
  }

  /**
   * Database fallback: check and consume nonce via SQL Nonce table
   */
  private async validateViaDatabase(
    nonce: string,
    hashId?: string,
  ): Promise<NonceValidationResult> {
    const hashedNonce = this.hashNonce(nonce);

    // Check if nonce already exists in DB
    const existingNonce = await this.prisma.nonce.findUnique({
      where: { original_nonce: hashedNonce },
    });

    if (existingNonce) {
      this.logger.warn(
        `Replay attack detected (DB fallback): nonce already used for device ${hashId?.substring(0, 8) || 'unknown'}...`,
      );
      return {
        isValid: false,
        reason: 'Nonce has already been used (replay attack detected)',
      };
    }

    // Store nonce in DB
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.getTtlMs());
    await this.prisma.nonce.create({
      data: {
        original_nonce: hashedNonce,
        hash_id: hashId || 'unknown',
        used_at: now,
        expires_at: expiresAt,
      },
    });

    this.logger.log(
      `Nonce validated and consumed (DB fallback) for device ${hashId?.substring(0, 8) || 'unknown'}...`,
    );

    return { isValid: true };
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
    const ttlSeconds = parseInt(this.defaultTtlSeconds.toString());
    return ttlSeconds * 1000;
  }

  /**
   * Manually invalidates a nonce (marks it as used)
   * Useful for administrative purposes or cleanup
   * @param nonce - Nonce to invalidate
   * @param reason - Reason for invalidation
   * @returns Promise indicating success
   */
  async invalidateNonce(
    nonce: string,
    reason: string = 'Manual invalidation',
  ): Promise<boolean> {
    try {
      if (!nonce || nonce.trim().length === 0) {
        return false;
      }

      const nonceKey = this.getNonceKey(nonce);
      const ttlMs = this.getTtlMs();

      await this.cacheManager.set(
        nonceKey,
        {
          invalidatedAt: Date.now(),
          reason,
          originalNonce: nonce.substring(0, 16) + '...',
        },
        ttlMs,
      );

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
  async getNonceStats(): Promise<{
    totalUsedNonces: number;
    redisConnected: boolean;
  }> {
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
