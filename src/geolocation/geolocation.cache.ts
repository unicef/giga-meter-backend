import { createHash } from 'crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { Counter, register } from 'prom-client';

/** Injection token for the Redis client the cache talks to. */
export const GEOLOCATION_REDIS = Symbol('GEOLOCATION_REDIS');

/**
 * Google's terms allow latitude/longitude to be cached temporarily, for at most
 * 30 consecutive days. The env var can shorten that, never lengthen it.
 */
export const MAX_CACHE_TTL_SECONDS = 30 * 24 * 60 * 60;

/**
 * A "no location for these access points" answer is kept for a day only: the
 * provider's coverage changes, and a stale miss must not outlive the APs.
 */
export const NOT_FOUND_TTL_SECONDS = 24 * 60 * 60;

/**
 * Upper bound for any one Redis call. ioredis queues commands while it is
 * disconnected, so without this a Redis outage would stall every geolocate
 * request instead of falling through to the provider.
 */
export const REDIS_OP_TIMEOUT_MS = 250;

/** Google needs at least this many distinct access points to answer. */
export const MIN_ACCESS_POINTS = 2;

/**
 * Overlap matching: a cached answer is reused for a scan that is not the same
 * set when at least this many access points are shared...
 */
export const OVERLAP_MIN_SHARED = 2;
/** ...and the shared ones are at least this fraction of the current scan. */
export const OVERLAP_MIN_RATIO = 0.6;
/** Cap on the cached sets scored per lookup, so a busy AP cannot fan out. */
export const OVERLAP_MAX_CANDIDATES = 20;

const KEY_PREFIX = 'geo:v1';

export interface GeolocateResult {
  location: { lat: number; lng: number };
  accuracy: number;
}

export type CacheLookup =
  | { kind: 'hit'; result: GeolocateResult; match: 'exact' | 'overlap' }
  | { kind: 'notFound' }
  | { kind: 'miss' };

/** What is stored per access point set. */
interface CacheEntry {
  /** Hashed access points of the set, used to score overlap matches. */
  aps: string[];
  /** When the provider answered: bounds the entry's life, even when aliased. */
  fetchedAt: number;
  result: GeolocateResult | null;
}

const lookups: Counter<'result'> =
  (register.getSingleMetric(
    'geolocation_cache_lookups_total',
  ) as Counter<'result'>) ??
  new Counter({
    name: 'geolocation_cache_lookups_total',
    help: 'Geolocate lookups by outcome: exact, overlap, not_found, miss, too_few_aps, error',
    labelNames: ['result'],
  });

/**
 * Normalises a MAC address to lowercase colon form, or null when it is not one
 * the provider can locate. Only universally administered unicast addresses can
 * be located; the rest are silently dropped by the provider anyway, and they
 * include the randomised MACs of phone hotspots, which come and go between
 * scans and would otherwise keep two scans of the same room from matching.
 */
export function normalizeMac(raw: string): string | null {
  const hex = (raw ?? '').replace(/[^0-9a-fA-F]/g, '').toLowerCase();
  if (hex.length !== 12) {
    return null;
  }
  const firstOctet = parseInt(hex.slice(0, 2), 16);
  if (firstOctet & 0x01) {
    return null; // multicast, including the broadcast address
  }
  if (firstOctet & 0x02) {
    return null; // locally administered (randomised, hotspots, virtual)
  }
  if (hex.startsWith('00005e')) {
    return null; // IANA reserved
  }
  return hex.match(/../g).join(':');
}

/**
 * Hash of one access point. Neighbouring networks are used in transit and not
 * stored, so the cache keeps hashes, never MAC addresses.
 */
export function hashMac(mac: string): string {
  return createHash('sha256').update(mac).digest('hex').slice(0, 16);
}

/**
 * Cache of provider answers keyed by the set of access points in the scan.
 *
 * The key is the set, not the list: order and signal strength (which changes
 * every scan) do not matter. Every call degrades to a miss when Redis is slow
 * or down, so the cache can make a lookup cheaper but never make it fail.
 */
@Injectable()
export class GeolocationCache {
  private readonly logger = new Logger(GeolocationCache.name);
  private readonly ttlSeconds = Math.min(
    parseInt(process.env.GEOLOCATION_CACHE_TTL_SECONDS, 10) ||
      MAX_CACHE_TTL_SECONDS,
    MAX_CACHE_TTL_SECONDS,
  );
  private readonly overlapEnabled =
    process.env.GEOLOCATION_CACHE_OVERLAP === 'true';

  constructor(@Inject(GEOLOCATION_REDIS) private readonly redis: Redis) {}

  /** Records a lookup that never reached the cache, such as a too-small scan. */
  count(result: string): void {
    lookups.inc({ result });
  }

  async get(macs: string[]): Promise<CacheLookup> {
    const aps = macs.map(hashMac);
    try {
      const exact = this.parse(
        await this.withTimeout(this.redis.get(this.setKey(aps))),
      );
      if (exact) {
        if (exact.result === null) {
          lookups.inc({ result: 'not_found' });
          return { kind: 'notFound' };
        }
        lookups.inc({ result: 'exact' });
        return { kind: 'hit', result: exact.result, match: 'exact' };
      }

      if (this.overlapEnabled) {
        const overlap = await this.findOverlap(aps);
        if (overlap) {
          lookups.inc({ result: 'overlap' });
          return { kind: 'hit', result: overlap.result, match: 'overlap' };
        }
      }

      lookups.inc({ result: 'miss' });
      return { kind: 'miss' };
    } catch (error) {
      lookups.inc({ result: 'error' });
      this.logger.warn(
        `cache read failed, asking the provider: ${error?.message}`,
      );
      return { kind: 'miss' };
    }
  }

  /** Stores the provider's answer; null means it found no location. */
  async set(macs: string[], result: GeolocateResult | null): Promise<void> {
    const aps = macs.map(hashMac);
    const entry: CacheEntry = { aps, fetchedAt: Date.now(), result };
    try {
      await this.withTimeout(this.write(aps, entry));
    } catch (error) {
      this.logger.warn(`cache write failed: ${error?.message}`);
    }
  }

  private async write(aps: string[], entry: CacheEntry): Promise<void> {
    const key = this.setKey(aps);
    const ttl = entry.result ? this.remainingTtl(entry) : NOT_FOUND_TTL_SECONDS;
    if (ttl <= 0) {
      return;
    }
    const pipeline = this.redis
      .multi()
      .set(key, JSON.stringify(entry), 'EX', ttl);
    // Misses are not indexed: a subset of a set with no location says nothing.
    if (this.overlapEnabled && entry.result) {
      for (const ap of aps) {
        pipeline.sadd(this.apKey(ap), key).expire(this.apKey(ap), ttl);
      }
    }
    await pipeline.exec();
  }

  /**
   * Finds a cached set that shares enough access points with this scan: a scan
   * that saw a subset of a known room, or the same room plus a newcomer.
   */
  private async findOverlap(aps: string[]): Promise<CacheEntry | null> {
    const members = await this.withTimeout(
      this.redis.pipeline(aps.map((ap) => ['smembers', this.apKey(ap)])).exec(),
    );

    const shared = new Map<string, number>();
    for (const [error, keys] of members ?? []) {
      if (error) continue;
      for (const key of keys as string[]) {
        shared.set(key, (shared.get(key) ?? 0) + 1);
      }
    }

    const candidates = [...shared.entries()]
      .filter(([, count]) => count >= OVERLAP_MIN_SHARED)
      .filter(([, count]) => count / aps.length >= OVERLAP_MIN_RATIO)
      .sort((a, b) => b[1] - a[1])
      .slice(0, OVERLAP_MAX_CANDIDATES);
    if (candidates.length === 0) {
      return null;
    }

    const entries = await this.withTimeout(
      this.redis.mget(candidates.map(([key]) => key)),
    );
    // Candidates are sorted by shared count, so the first live one is the best.
    const best = entries.map((raw) => this.parse(raw)).find((e) => e?.result);
    if (!best) {
      return null;
    }

    // Alias this exact set to the answer, so the next scan like it is a single
    // GET. It keeps the original fetch time, so the alias expires with it.
    await this.withTimeout(this.write(aps, { ...best, aps })).catch((error) =>
      this.logger.warn(`cache alias write failed: ${error?.message}`),
    );
    return best;
  }

  private remainingTtl(entry: CacheEntry): number {
    const ageSeconds = Math.floor((Date.now() - entry.fetchedAt) / 1000);
    return this.ttlSeconds - ageSeconds;
  }

  private parse(raw: string | null): CacheEntry | null {
    if (!raw) return null;
    try {
      const entry = JSON.parse(raw) as CacheEntry;
      // Never serve past the TTL the entry was fetched under.
      if (entry.result && this.remainingTtl(entry) <= 0) return null;
      return entry;
    } catch {
      return null;
    }
  }

  private setKey(aps: string[]): string {
    const digest = createHash('sha256')
      .update([...aps].sort().join(','))
      .digest('hex');
    return `${KEY_PREFIX}:set:${digest}`;
  }

  private apKey(ap: string): string {
    return `${KEY_PREFIX}:ap:${ap}`;
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
