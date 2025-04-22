export interface CacheConfig {
  models: {
    [key: string]: {
      actions: string[];
      ttl?: number; // Time to live in seconds
    };
  };
}

// Keep DEFAULT_CACHE_TTL for use in app.module.ts
export const DEFAULT_CACHE_TTL = 1800; // 30 minutes (in seconds, convert to ms for cache-manager v5)
