export interface RateLimitConfig {
  models: {
    [key: string]: {
      default: {
        limit: number;
        ttl: number;  // Time to live in milliseconds
      }
    };
  };
}

const RATE_LIMIT_TTL = 60000; // 60 seconds in milliseconds
const DEFAULT_RATE_LIMIT = 60;

export const defaultRateLimitConfig = {
  default: {
    limit: parseInt(process.env.RATE_LIMIT_MAX, 10) || DEFAULT_RATE_LIMIT,
    ttl: RATE_LIMIT_TTL
  }
};

export const RATE_LIMIT_CONFIG: RateLimitConfig = {
  models: {
    measurements: defaultRateLimitConfig,
    countries: defaultRateLimitConfig,
    schools: defaultRateLimitConfig
  }
};

export const getRateLimitConfig = (model: string) => {
  const config = RATE_LIMIT_CONFIG.models[model];
  if (!config) {
    throw new Error(`Rate limit configuration not found for model: ${model}`);
  }
  return config;
};
