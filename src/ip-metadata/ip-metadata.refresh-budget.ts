import { Inject, Injectable } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { Counter, register } from 'prom-client';

/** Injection token for the Redis client the refresh budget is counted in. */
export const IP_METADATA_REDIS = Symbol('IP_METADATA_REDIS');

/**
 * Refreshes of already-saved IPs allowed per hour, across all instances, when
 * IPINFO_REFRESH_PER_HOUR is not set. 125 an hour is about 3,000 a day, which
 * keeps refreshes from using up the IPInfo request quota.
 */
export const DEFAULT_REFRESHES_PER_HOUR = 125;

/**
 * Upper bound for the Redis call. ioredis queues commands while it is
 * disconnected, so without this a Redis outage would hold the request open.
 */
export const REDIS_OP_TIMEOUT_MS = 250;

const KEY_PREFIX = 'ipinfo:v1:refresh';

// Each hour's counter only needs to outlive its hour.
const KEY_TTL_SECONDS = 2 * 60 * 60;

const skippedRefreshes: Counter<'reason'> =
  (register.getSingleMetric(
    'ip_metadata_refresh_skipped_total',
  ) as Counter<'reason'>) ??
  new Counter({
    name: 'ip_metadata_refresh_skipped_total',
    help: 'Saved IP records past their age served without a refresh: budget (hourly budget used up), redis_error (budget could not be checked)',
    labelNames: ['reason'],
  });

/** The hourly budget from IPINFO_REFRESH_PER_HOUR; 0 turns refreshes off. */
export function refreshesPerHour(): number {
  const value = process.env.IPINFO_REFRESH_PER_HOUR;
  if (value === undefined || value.trim() === '') {
    return DEFAULT_REFRESHES_PER_HOUR;
  }
  const limit = Number(value);
  return Number.isInteger(limit) && limit >= 0
    ? limit
    : DEFAULT_REFRESHES_PER_HOUR;
}

/**
 * Spreads IPInfo refreshes of saved records over time: each instance takes one
 * from a counter shared in Redis, per UTC hour, before refreshing. When the
 * hour's budget is used up, or Redis can't be reached, the saved record is
 * served as it is and refreshed on a later lookup. Lookups of IPs that have
 * never been seen don't go through here: they have nothing to fall back on.
 */
@Injectable()
export class IpInfoRefreshBudget {
  constructor(@Inject(IP_METADATA_REDIS) private readonly redis: Redis) {}

  async tryTake(now: Date = new Date()): Promise<boolean> {
    const limit = refreshesPerHour();
    if (limit === 0) {
      skippedRefreshes.inc({ reason: 'budget' });
      return false;
    }

    // e.g. ipinfo:v1:refresh:2026-11-19T15
    const key = `${KEY_PREFIX}:${now.toISOString().slice(0, 13)}`;
    try {
      const replies = await this.withTimeout(
        this.redis.multi().incr(key).expire(key, KEY_TTL_SECONDS).exec(),
      );
      const [error, used] = replies?.[0] ?? [];
      if (error || typeof used !== 'number') {
        throw error ?? new Error('unexpected reply to INCR');
      }
      if (used > limit) {
        skippedRefreshes.inc({ reason: 'budget' });
        return false;
      }
      return true;
    } catch (error) {
      console.warn(
        'IP metadata refresh budget unavailable, serving the saved record:',
        error instanceof Error ? error.message : error,
      );
      skippedRefreshes.inc({ reason: 'redis_error' });
      return false;
    }
  }

  private withTimeout<T>(promise: Promise<T>): Promise<T> {
    let timer: NodeJS.Timeout;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () =>
          reject(
            new Error(`redis did not answer in ${REDIS_OP_TIMEOUT_MS} ms`),
          ),
        REDIS_OP_TIMEOUT_MS,
      );
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
  }
}
