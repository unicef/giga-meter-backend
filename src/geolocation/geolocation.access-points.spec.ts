import {
  BadRequestException,
  HttpException,
  HttpStatus,
  PipeTransform,
} from '@nestjs/common';
import { PIPES_METADATA } from '@nestjs/common/constants';
import { HttpService } from '@nestjs/axios';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { of } from 'rxjs';
import {
  GeolocationController,
  strongestAccessPoints,
} from './geolocation.controller';
import { GeolocationCache } from './geolocation.cache';
import { GeolocationCircuit } from './geolocation.circuit';
import {
  GeolocateBodyDto,
  MAX_WIFI_ACCESS_POINTS,
  MAX_WIFI_ACCESS_POINTS_ACCEPTED,
} from './geolocation.dto';
import { AuthGuard } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';

const RESULT = { location: { lat: 1.5, lng: 2.5 }, accuracy: 30 };

/** A distinct, locatable (universally administered unicast) MAC per index. */
const mac = (i: number) =>
  `00:11:22:33:${((i >> 8) & 0xff).toString(16).padStart(2, '0')}:${(i & 0xff)
    .toString(16)
    .padStart(2, '0')}`;

/** A randomised MAC, as phone hotspots use: never sent to the provider. */
const randomisedMac = (i: number) =>
  `da:a1:19:00:00:${(i & 0xff).toString(16).padStart(2, '0')}`;

/** `count` locatable access points, the first one the strongest. */
const scan = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    macAddress: mac(i),
    signalStrength: -30 - i,
  }));

/** Deterministic shuffle, so the order the client sends is not the answer. */
const shuffled = <T>(items: T[]) =>
  items
    .map((item, i) => ({ item, key: (i * 7919) % items.length }))
    .sort((a, b) => a.key - b.key)
    .map(({ item }) => item);

describe('strongestAccessPoints', () => {
  it('returns a list within the limit as it is', () => {
    const aps = shuffled(scan(MAX_WIFI_ACCESS_POINTS));

    expect(strongestAccessPoints(aps, MAX_WIFI_ACCESS_POINTS)).toBe(aps);
  });

  it('keeps the strongest, strongest first', () => {
    const aps = [
      { macAddress: 'a', signalStrength: -80 },
      { macAddress: 'b', signalStrength: -40 },
      { macAddress: 'c', signalStrength: -60 },
      { macAddress: 'd', signalStrength: -50 },
    ];

    expect(strongestAccessPoints(aps, 3).map((ap) => ap.macAddress)).toEqual([
      'b',
      'd',
      'c',
    ]);
  });

  it('keeps the order they came in for equal strengths', () => {
    const aps = [
      { macAddress: 'a', signalStrength: -70 },
      { macAddress: 'b', signalStrength: -60 },
      { macAddress: 'c', signalStrength: -70 },
      { macAddress: 'd', signalStrength: -70 },
    ];

    expect(strongestAccessPoints(aps, 3).map((ap) => ap.macAddress)).toEqual([
      'b',
      'a',
      'c',
    ]);
  });

  it('puts a missing strength after every reported one, in order', () => {
    const aps = [
      { macAddress: 'a' },
      { macAddress: 'b', signalStrength: -95 },
      { macAddress: 'c', signalStrength: null },
      { macAddress: 'd', signalStrength: -90 },
      { macAddress: 'e' },
    ];

    expect(strongestAccessPoints(aps, 4).map((ap) => ap.macAddress)).toEqual([
      'd',
      'b',
      'a',
      'c',
    ]);
  });
});

describe('Geolocate access point limits', () => {
  /** The validation pipe the route actually runs, with its real options. */
  const routePipe = (): PipeTransform => {
    const pipes = Reflect.getMetadata(
      PIPES_METADATA,
      GeolocationController.prototype.geolocate,
    );
    expect(pipes).toHaveLength(1);
    return pipes[0];
  };

  const validate = (body: unknown) =>
    routePipe().transform(body, {
      type: 'body',
      metatype: GeolocateBodyDto,
      data: undefined,
    });

  it.each([MAX_WIFI_ACCESS_POINTS + 1, 200, MAX_WIFI_ACCESS_POINTS_ACCEPTED])(
    'accepts a scan of %i access points',
    async (count) => {
      const body = await validate({
        considerIp: false,
        wifiAccessPoints: scan(count),
      });

      expect(body).toBeInstanceOf(GeolocateBodyDto);
      expect(body.wifiAccessPoints).toHaveLength(count);
    },
  );

  it('still rejects a list above the accepted bound', async () => {
    await expect(
      validate({
        considerIp: false,
        wifiAccessPoints: scan(MAX_WIFI_ACCESS_POINTS_ACCEPTED + 1),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts access points without a signal strength', async () => {
    const aps = scan(MAX_WIFI_ACCESS_POINTS + 5).map(({ macAddress }) => ({
      macAddress,
    }));

    await expect(
      validate({ considerIp: false, wifiAccessPoints: aps }),
    ).resolves.toBeInstanceOf(GeolocateBodyDto);
  });

  describe('trimming before the cache and the provider', () => {
    let controller: GeolocationController;
    let post: jest.Mock;
    let cache: { get: jest.Mock; set: jest.Mock; count: jest.Mock };

    beforeEach(async () => {
      process.env.GOOGLE_GEOLOCATION_API_KEY = 'google-key';
      post = jest.fn().mockReturnValue(of({ data: RESULT }));
      cache = {
        get: jest.fn().mockResolvedValue({ kind: 'miss' }),
        set: jest.fn().mockResolvedValue(undefined),
        count: jest.fn(),
      };

      const moduleRef = await Test.createTestingModule({
        controllers: [GeolocationController],
        providers: [
          GeolocationCircuit,
          { provide: GeolocationCache, useValue: cache },
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

    const geolocate = (aps: object[]) =>
      controller.geolocate({ considerIp: false, wifiAccessPoints: aps } as any);
    const sentMacs = (): string[] =>
      post.mock.calls[0][1].wifiAccessPoints.map((ap) => ap.macAddress);

    it(`sends the provider the ${MAX_WIFI_ACCESS_POINTS} strongest and caches under them`, async () => {
      const aps = scan(120);

      expect(await geolocate(shuffled(aps))).toEqual(RESULT);

      const strongest = aps
        .slice(0, MAX_WIFI_ACCESS_POINTS)
        .map((ap) => ap.macAddress);
      expect(sentMacs()).toEqual(strongest);
      expect(cache.get).toHaveBeenCalledWith([...strongest].sort());
      expect(cache.set).toHaveBeenCalledWith([...strongest].sort(), RESULT);
    });

    it('keeps the earlier of equal strengths and drops missing ones first', async () => {
      const aps = [
        ...scan(MAX_WIFI_ACCESS_POINTS - 2),
        { macAddress: mac(1000) },
        { macAddress: mac(1001), signalStrength: -99 },
        { macAddress: mac(1002), signalStrength: -99 },
        { macAddress: mac(1003), signalStrength: -99 },
        { macAddress: mac(1004) },
      ];

      await geolocate(aps);

      expect(sentMacs()).toHaveLength(MAX_WIFI_ACCESS_POINTS);
      expect(sentMacs()).toEqual(
        expect.arrayContaining([mac(1001), mac(1002)]),
      );
      expect(sentMacs()).not.toContain(mac(1003));
      expect(sentMacs()).not.toContain(mac(1000));
      expect(sentMacs()).not.toContain(mac(1004));
    });

    it('does not let access points it cannot locate take a slot', async () => {
      const hotspots = Array.from({ length: 10 }, (_, i) => ({
        macAddress: randomisedMac(i),
        signalStrength: -10,
      }));
      const aps = scan(MAX_WIFI_ACCESS_POINTS);

      await geolocate([...hotspots, ...aps]);

      expect(sentMacs()).toEqual(aps.map((ap) => ap.macAddress));
    });

    it('still answers 422 without a call when fewer than two can be located', async () => {
      const hotspots = Array.from({ length: 60 }, (_, i) => ({
        macAddress: randomisedMac(i),
        signalStrength: -40,
      }));

      const error = await geolocate([...hotspots, ...scan(1)]).catch((e) => e);

      expect((error as HttpException).getStatus()).toBe(
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
      expect(post).not.toHaveBeenCalled();
      expect(cache.get).not.toHaveBeenCalled();
    });
  });
});
