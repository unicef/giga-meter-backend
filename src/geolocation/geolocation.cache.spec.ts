import { HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { of, Subject, throwError } from 'rxjs';
import {
  GeolocationCache,
  GEOLOCATION_REDIS,
  MAX_CACHE_TTL_SECONDS,
  NOT_FOUND_TTL_SECONDS,
  hashMac,
  normalizeMac,
} from './geolocation.cache';
import { GeolocationCircuit } from './geolocation.circuit';
import { GeolocationController } from './geolocation.controller';
import { AuthGuard } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';

/**
 * The slice of ioredis the cache uses, in memory. Records the TTL of every
 * write so the tests can check it.
 */
class FakeRedis {
  strings = new Map<string, string>();
  sets = new Map<string, Set<string>>();
  ttls = new Map<string, number>();
  down = false;

  async get(key: string) {
    this.check();
    return this.strings.get(key) ?? null;
  }

  async mget(keys: string[]) {
    this.check();
    return keys.map((k) => this.strings.get(k) ?? null);
  }

  multi() {
    const ops: (() => void)[] = [];
    const chain = {
      set: (key: string, value: string, _ex: string, ttl: number) => {
        ops.push(() => {
          this.strings.set(key, value);
          this.ttls.set(key, ttl);
        });
        return chain;
      },
      sadd: (key: string, member: string) => {
        ops.push(() => {
          if (!this.sets.has(key)) this.sets.set(key, new Set());
          this.sets.get(key).add(member);
        });
        return chain;
      },
      expire: (key: string, ttl: number) => {
        ops.push(() => this.ttls.set(key, ttl));
        return chain;
      },
      exec: async () => {
        this.check();
        ops.forEach((op) => op());
        return [];
      },
    };
    return chain;
  }

  pipeline(commands: [string, string][]) {
    return {
      exec: async () => {
        this.check();
        return commands.map(([, key]) => [
          null,
          [...(this.sets.get(key) ?? [])],
        ]);
      },
    };
  }

  private check() {
    if (this.down) throw new Error('connection refused');
  }
}

const A = '00:11:22:33:44:01';
const B = '00:11:22:33:44:02';
const C = '00:11:22:33:44:03';
const D = '00:11:22:33:44:04';
const E = '00:11:22:33:44:05';
const RESULT = { location: { lat: 12.5, lng: 77.1 }, accuracy: 30 };

describe('normalizeMac', () => {
  it.each([
    ['00:11:22:33:44:55', '00:11:22:33:44:55'],
    ['00-11-22-33-44-55', '00:11:22:33:44:55'],
    ['001122334455', '00:11:22:33:44:55'],
    ['AC:DE:48:00:11:22', 'ac:de:48:00:11:22'],
  ])('normalises %s', (raw, expected) => {
    expect(normalizeMac(raw)).toBe(expected);
  });

  it.each([
    ['ff:ff:ff:ff:ff:ff', 'broadcast'],
    ['01:00:5e:00:00:01', 'multicast'],
    ['00:00:5e:00:53:01', 'IANA reserved'],
    ['da:a1:19:00:00:01', 'locally administered (randomised hotspot)'],
    ['00:11:22', 'too short'],
    ['', 'empty'],
  ])('drops %s (%s)', (raw) => {
    expect(normalizeMac(raw)).toBeNull();
  });
});

describe('GeolocationCache', () => {
  let redis: FakeRedis;
  const build = () => new GeolocationCache(redis as any);

  beforeEach(() => {
    redis = new FakeRedis();
    delete process.env.GEOLOCATION_CACHE_OVERLAP;
    delete process.env.GEOLOCATION_CACHE_TTL_SECONDS;
  });

  it('hits for the same set whatever the order', async () => {
    const cache = build();
    await cache.set([A, B, C], RESULT);

    expect(await cache.get([C, A, B])).toEqual({
      kind: 'hit',
      result: RESULT,
      match: 'exact',
    });
  });

  it('misses for a different set when overlap matching is off', async () => {
    const cache = build();
    await cache.set([A, B, C], RESULT);

    expect(await cache.get([A, B])).toEqual({ kind: 'miss' });
  });

  it('keeps a location for 30 days and a not-found for a day', async () => {
    const cache = build();
    await cache.set([A, B], RESULT);
    await cache.set([C, D], null);

    expect([...redis.ttls.values()].sort((a, b) => a - b)).toEqual([
      NOT_FOUND_TTL_SECONDS,
      MAX_CACHE_TTL_SECONDS,
    ]);
    expect(await cache.get([C, D])).toEqual({ kind: 'notFound' });
  });

  it('never keeps a location longer than 30 days, whatever the env says', async () => {
    process.env.GEOLOCATION_CACHE_TTL_SECONDS = String(
      MAX_CACHE_TTL_SECONDS * 2,
    );
    await build().set([A, B], RESULT);

    expect([...redis.ttls.values()]).toEqual([MAX_CACHE_TTL_SECONDS]);
  });

  it('stores hashes, never MAC addresses', async () => {
    process.env.GEOLOCATION_CACHE_OVERLAP = 'true';
    await build().set([A, B], RESULT);

    const everything = JSON.stringify([
      ...redis.strings.entries(),
      ...[...redis.sets.entries()].map(([k, v]) => [k, [...v]]),
    ]);
    expect(everything).not.toContain(A);
    expect(everything).not.toContain(A.replace(/:/g, ''));
    expect(everything).toContain(hashMac(A));
  });

  it('degrades to a miss when Redis is down', async () => {
    const cache = build();
    redis.down = true;

    expect(await cache.get([A, B])).toEqual({ kind: 'miss' });
    await expect(cache.set([A, B], RESULT)).resolves.toBeUndefined();
  });

  it('degrades to a miss when Redis does not answer', async () => {
    const cache = build();
    jest.spyOn(redis, 'get').mockReturnValue(new Promise(() => undefined));

    const startedAt = Date.now();
    expect(await cache.get([A, B])).toEqual({ kind: 'miss' });
    expect(Date.now() - startedAt).toBeLessThan(1_000);
  });

  describe('overlap matching', () => {
    beforeEach(() => {
      process.env.GEOLOCATION_CACHE_OVERLAP = 'true';
    });

    it('hits for a subset of a cached set', async () => {
      const cache = build();
      await cache.set([A, B, C, D, E], RESULT);

      expect(await cache.get([B, D])).toEqual({
        kind: 'hit',
        result: RESULT,
        match: 'overlap',
      });
    });

    it('hits when the scan adds a newcomer to a cached room', async () => {
      const cache = build();
      await cache.set([A, B, C], RESULT);

      // 3 of 4 shared: 75%.
      expect((await cache.get([A, B, C, D])).kind).toBe('hit');
    });

    it('misses when only one access point is shared', async () => {
      const cache = build();
      await cache.set([A, B, C], RESULT);

      expect(await cache.get([A, D])).toEqual({ kind: 'miss' });
    });

    it('misses when the shared access points are a minority of the scan', async () => {
      const cache = build();
      await cache.set([A, B], RESULT);

      // 2 of 5 shared: 40%, likely a neighbouring site that sees two of them.
      expect(await cache.get([A, B, C, D, E])).toEqual({ kind: 'miss' });
    });

    it('prefers the cached set that shares the most access points', async () => {
      const cache = build();
      const other = { location: { lat: 1, lng: 1 }, accuracy: 50 };
      await cache.set([A, B, E], other);
      await cache.set([A, B, C, D], RESULT);

      const lookup = await cache.get([A, B, C]);
      expect(lookup.kind === 'hit' && lookup.result).toEqual(RESULT);
    });

    it('does not match a subset against a cached not-found', async () => {
      const cache = build();
      await cache.set([A, B, C], null);

      expect(await cache.get([A, B])).toEqual({ kind: 'miss' });
    });

    it('aliases the matched set without extending the original expiry', async () => {
      const cache = build();
      const tenDaysAgo = Date.now() - 10 * 24 * 60 * 60 * 1000;
      jest.spyOn(Date, 'now').mockReturnValueOnce(tenDaysAgo);
      await cache.set([A, B, C, D, E], RESULT);
      (Date.now as jest.Mock).mockRestore();
      redis.ttls.clear();

      await cache.get([A, B]);

      const aliasTtls = [...redis.ttls.values()];
      expect(aliasTtls.length).toBeGreaterThan(0);
      for (const ttl of aliasTtls) {
        expect(ttl).toBeLessThanOrEqual(20 * 24 * 60 * 60);
      }
      // And the alias is now an exact hit.
      expect(await cache.get([B, A])).toMatchObject({ match: 'exact' });
    });
  });
});

describe('GeolocationController with the cache', () => {
  let controller: GeolocationController;
  let post: jest.Mock;
  let redis: FakeRedis;

  const body = (...macs: string[]) =>
    ({
      considerIp: false,
      wifiAccessPoints: macs.map((macAddress, i) => ({
        macAddress,
        signalStrength: -50 - i,
      })),
    }) as any;

  beforeEach(async () => {
    process.env.GOOGLE_GEOLOCATION_API_KEY = 'google-key';
    delete process.env.GEOLOCATION_CACHE_OVERLAP;
    redis = new FakeRedis();
    post = jest.fn().mockReturnValue(of({ data: RESULT }));

    const moduleRef = await Test.createTestingModule({
      controllers: [GeolocationController],
      providers: [
        GeolocationCircuit,
        GeolocationCache,
        { provide: GEOLOCATION_REDIS, useValue: redis },
        { provide: HttpService, useValue: { post } },
        { provide: PrismaService, useValue: {} },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => Promise.resolve(true) })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = moduleRef.get(GeolocationController);
  });

  afterEach(() => {
    delete process.env.GOOGLE_GEOLOCATION_API_KEY;
  });

  it('asks the provider once for the same access points', async () => {
    expect(await controller.geolocate(body(A, B, C))).toEqual(RESULT);
    // Different order, different signal strengths, different MAC notation.
    expect(
      await controller.geolocate(
        body(C.toUpperCase(), B.replace(/:/g, '-'), A),
      ),
    ).toEqual(RESULT);

    expect(post).toHaveBeenCalledTimes(1);
  });

  it('answers 422 without calling the provider below two access points', async () => {
    const error = await controller
      .geolocate(body(A, 'da:a1:19:00:00:01', 'ff:ff:ff:ff:ff:ff'))
      .catch((e) => e);

    expect((error as HttpException).getStatus()).toBe(
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
    expect(post).not.toHaveBeenCalled();
  });

  it('sends the provider only the access points it can locate', async () => {
    await controller.geolocate(body(A, 'da:a1:19:00:00:01', B, A));

    const sent = post.mock.calls[0][1];
    expect(sent.considerIp).toBe(false);
    expect(sent.wifiAccessPoints.map((ap) => ap.macAddress)).toEqual([A, B]);
  });

  it('remembers a not-found, and still answers 422 for it', async () => {
    post.mockReturnValue(
      throwError(() => ({ response: { status: 404, data: {} } })),
    );

    for (let i = 0; i < 2; i++) {
      const error = await controller.geolocate(body(A, B)).catch((e) => e);
      expect((error as HttpException).getStatus()).toBe(
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('does not cache a provider failure', async () => {
    post
      .mockReturnValueOnce(
        throwError(() => ({ response: { status: 500, data: {} } })),
      )
      .mockReturnValueOnce(of({ data: RESULT }));

    await controller.geolocate(body(A, B)).catch(() => undefined);
    expect(await controller.geolocate(body(A, B))).toEqual(RESULT);
    expect(post).toHaveBeenCalledTimes(2);
  });

  it('shares one provider call between concurrent identical requests', async () => {
    const upstream = new Subject<{ data: typeof RESULT }>();
    post.mockReturnValue(upstream);

    const pending = Promise.all(
      Array.from({ length: 20 }, () => controller.geolocate(body(A, B, C))),
    );
    await new Promise((resolve) => setImmediate(resolve));
    upstream.next({ data: RESULT });
    upstream.complete();

    expect(await pending).toEqual(Array(20).fill(RESULT));
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('still answers when Redis is down', async () => {
    redis.down = true;

    expect(await controller.geolocate(body(A, B))).toEqual(RESULT);
  });
});
