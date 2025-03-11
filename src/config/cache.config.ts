export interface CacheConfig {
  models: {
    [key: string]: {
      actions: string[];
      ttl?: number;  // Time to live in seconds
    };
  };
}

export const DEFAULT_CACHE_TTL = 1800; // 30 minutes

export const CACHE_CONFIG: CacheConfig = {
  models: {
    measurements: {
      actions: ['findMany', 'findUnique', 'findFirstOrThrow', 'findFirst'],
      ttl: parseInt(process.env.CACHE_EXPIRE, 10) || DEFAULT_CACHE_TTL // Default to 30 minutes if not set
    },
    dailycheckapp_country: {
      actions: ['findMany', 'findUnique', 'findFirstOrThrow', 'findFirst'],
      ttl: parseInt(process.env.CACHE_EXPIRE, 10) || DEFAULT_CACHE_TTL
    },
    dailycheckapp_school: {
      actions: ['findMany', 'findUnique', 'findFirstOrThrow', 'findFirst'],
      ttl: parseInt(process.env.CACHE_EXPIRE, 10) || DEFAULT_CACHE_TTL
    }
  }
};

export const isCacheable = (model: string, action: string): boolean => {
  const modelConfig = CACHE_CONFIG.models[model];
  return modelConfig ? modelConfig.actions.includes(action) : false;
};

export const getCacheTTL = (model: string): number => {
  return CACHE_CONFIG.models[model]?.ttl || DEFAULT_CACHE_TTL;
};
