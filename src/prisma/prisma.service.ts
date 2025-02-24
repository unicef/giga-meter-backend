import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { isCacheable, getCacheTTL } from './cache.config';

@Injectable()
export class PrismaService 
  extends PrismaClient 
  implements OnModuleInit, OnModuleDestroy 
{
  private redisClient: Redis;

  private serializeBigInt(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }
    
    if (typeof data === 'bigint') {
      return data.toString();
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.serializeBigInt(item));
    }
    
    if (typeof data === 'object') {
      return Object.fromEntries(
        Object.entries(data).map(([key, value]) => [
          key,
          this.serializeBigInt(value)
        ])
      );
    }
    
    return data;
  }

  constructor() {
    super();
    this.redisClient = new Redis(process.env.REDIS_URL);

    // Set up the caching middleware
    this.$use(async (params, next) => {
      // Apply caching only on configured models and actions
      if (!isCacheable(params.model, params.action)) {
        return next(params);
      }

      // Create a cache key based on model, action, and args
      const key = `${params.model}-${params.action}-${JSON.stringify(params.args)}`;

      try {
        // Attempt to fetch cached data
        const cachedResult = await this.redisClient.get(key);
        if (cachedResult) {
          // console.log('Cache hit for key:', key);
          return JSON.parse(cachedResult);
        }

        // No cached data, proceed with the database query
        const result = await next(params);

        // Cache the result with configured TTL
        if (result) {
          const serializedResult = this.serializeBigInt(result);
          const ttl = getCacheTTL(params.model);
          await this.redisClient.set(key, JSON.stringify(serializedResult), 'EX', ttl);
          // console.log('Cached result for key:', key, 'with TTL:', ttl);
        }

        return result;
      } catch (error) {
        console.error('Cache operation failed:', error);
        // If cache operations fail, still return the database result
        return next(params);
      }
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.redisClient.quit();
  }
}
