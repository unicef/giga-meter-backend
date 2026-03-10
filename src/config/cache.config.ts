import { CacheInterceptor } from '@nestjs/cache-manager';
import { NoOpInterceptor } from 'src/common/no-op.interceptor';

export interface CacheConfig {
  models: {
    [key: string]: {
      actions: string[];
      ttl?: number; // Time to live in seconds
    };
  };
}

export const CMS_DATA_CACHE_KEY = 'cms_data';

export const CACHE_INVALIDATE_KEYS  = [
  { key: 'all', name: 'All' },
  { key: CMS_DATA_CACHE_KEY, name: 'CMS' },
];

export const CACHE_TTL = Number(process.env.CACHE_EXPIRE) || 1800; // 30 minutes (in seconds)

export const CacheInterCeptorOptional =
  process.env.NO_CACHE === 'true' ? NoOpInterceptor : CacheInterceptor;
