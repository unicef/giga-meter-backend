import { Logger } from '@nestjs/common';
import Redis from 'ioredis';

const logger = new Logger('RedisClient');

// Initialize Redis client with retry strategy and error handling
const redisClient = new Redis(
  process.env.REDIS_URL || 'redis://localhost:6379',
  {
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
    retryStrategy(times) {
      return 10000;
    },
  },
);

// Handle connection errors (ECONNRESET, ECONNREFUSED, etc.) so unhandled error events do not crash the Node process
redisClient.on('error', (err: any) => {
  logger.warn(`Redis connection error: ${err.code}`);
});

export default redisClient;
