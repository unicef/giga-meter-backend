import type { Redis } from 'ioredis';
import {
  DEFAULT_REFRESHES_PER_HOUR,
  IpInfoRefreshBudget,
  REDIS_OP_TIMEOUT_MS,
  refreshesPerHour,
} from './ip-metadata.refresh-budget';

/** Just enough of ioredis for MULTI / INCR / EXPIRE / EXEC. */
function fakeRedis() {
  const counts = new Map<string, number>();
  const ttls = new Map<string, number>();
  const redis = {
    counts,
    ttls,
    multi() {
      const ops: Array<() => [Error | null, unknown]> = [];
      const chain = {
        incr(key: string) {
          ops.push(() => {
            counts.set(key, (counts.get(key) ?? 0) + 1);
            return [null, counts.get(key)];
          });
          return chain;
        },
        expire(key: string, seconds: number) {
          ops.push(() => {
            ttls.set(key, seconds);
            return [null, 1];
          });
          return chain;
        },
        exec: async () => ops.map((op) => op()),
      };
      return chain;
    },
  };
  return redis;
}

const at = (iso: string) => new Date(iso);

describe('IpInfoRefreshBudget', () => {
  afterEach(() => {
    delete process.env.IPINFO_REFRESH_PER_HOUR;
    jest.restoreAllMocks();
  });

  it('should allow 125 refreshes an hour by default, then refuse', async () => {
    const budget = new IpInfoRefreshBudget(fakeRedis() as unknown as Redis);
    const now = at('2026-11-19T15:20:00Z');

    const taken: boolean[] = [];
    for (let i = 0; i < DEFAULT_REFRESHES_PER_HOUR + 1; i++) {
      taken.push(await budget.tryTake(now));
    }

    expect(DEFAULT_REFRESHES_PER_HOUR).toBe(125);
    expect(taken.filter(Boolean)).toHaveLength(125);
    expect(taken[125]).toBe(false);
  });

  it('should start a new budget every UTC hour, kept for two hours', async () => {
    process.env.IPINFO_REFRESH_PER_HOUR = '1';
    const redis = fakeRedis();
    const budget = new IpInfoRefreshBudget(redis as unknown as Redis);

    expect(await budget.tryTake(at('2026-11-19T15:59:59Z'))).toBe(true);
    expect(await budget.tryTake(at('2026-11-19T15:00:00Z'))).toBe(false);
    expect(await budget.tryTake(at('2026-11-19T16:00:00Z'))).toBe(true);

    expect([...redis.counts.keys()]).toEqual([
      'ipinfo:v1:refresh:2026-11-19T15',
      'ipinfo:v1:refresh:2026-11-19T16',
    ]);
    expect(redis.ttls.get('ipinfo:v1:refresh:2026-11-19T15')).toBe(7200);
  });

  it('should read the budget from IPINFO_REFRESH_PER_HOUR', () => {
    process.env.IPINFO_REFRESH_PER_HOUR = '40';
    expect(refreshesPerHour()).toBe(40);

    for (const invalid of ['', ' ', 'abc', '-5', '2.5']) {
      process.env.IPINFO_REFRESH_PER_HOUR = invalid;
      expect(refreshesPerHour()).toBe(125);
    }
  });

  it('should refuse every refresh when the budget is set to 0', async () => {
    process.env.IPINFO_REFRESH_PER_HOUR = '0';
    const redis = fakeRedis();
    const budget = new IpInfoRefreshBudget(redis as unknown as Redis);

    expect(await budget.tryTake()).toBe(false);
    expect(redis.counts.size).toBe(0);
  });

  it('should refuse when Redis fails', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const redis = {
      multi: () => ({
        incr() {
          return this;
        },
        expire() {
          return this;
        },
        exec: async () => {
          throw new Error('connection refused');
        },
      }),
    };
    const budget = new IpInfoRefreshBudget(redis as unknown as Redis);

    expect(await budget.tryTake()).toBe(false);
  });

  it('should refuse when Redis returns an error for INCR', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const redis = {
      multi: () => ({
        incr() {
          return this;
        },
        expire() {
          return this;
        },
        exec: async () => [
          [new Error('WRONGTYPE'), null],
          [null, 1],
        ],
      }),
    };
    const budget = new IpInfoRefreshBudget(redis as unknown as Redis);

    expect(await budget.tryTake()).toBe(false);
  });

  it('should give up on a Redis that does not answer, instead of holding the request', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const redis = {
      multi: () => ({
        incr() {
          return this;
        },
        expire() {
          return this;
        },
        exec: () => new Promise(() => undefined), // never settles
      }),
    };
    const budget = new IpInfoRefreshBudget(redis as unknown as Redis);

    jest.useFakeTimers();
    try {
      let answer: boolean | undefined;
      const taking = budget.tryTake().then((taken) => (answer = taken));

      await jest.advanceTimersByTimeAsync(REDIS_OP_TIMEOUT_MS - 1);
      expect(answer).toBeUndefined();

      await jest.advanceTimersByTimeAsync(1);
      await taking;
      expect(answer).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });
});
