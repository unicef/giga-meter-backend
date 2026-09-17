import { HttpException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { of, throwError } from 'rxjs';
import { GeolocationController } from './geolocation.controller';
import { GeolocationCircuit } from './geolocation.circuit';
import { AuthGuard } from '../auth/auth.guard';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { IS_PUBLIC_KEY } from '../common/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CategoryConfigProvider } from '../common/category-config.provider';
import { mockCategoryConfigProvider } from '../common/mock-objects';

describe('GeolocationController', () => {
  let controller: GeolocationController;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GeolocationController],
      providers: [
        GeolocationCircuit,
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
            post: jest.fn(),
          },
        },
        { provide: PrismaService, useValue: {} },
        {
          provide: CategoryConfigProvider,
          useValue: mockCategoryConfigProvider,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => Promise.resolve(true) })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<GeolocationController>(GeolocationController);
    httpService = module.get<HttpService>(HttpService);
  });

  afterEach(() => {
    delete process.env.GOOGLE_GEOLOCATION_API_KEY;
  });

  it('should proxy geocode requests successfully', async () => {
    process.env.GOOGLE_GEOLOCATION_API_KEY = 'google-key';
    jest.spyOn(httpService, 'get').mockReturnValue(
      of({
        data: {
          results: [],
          status: 'OK',
        },
      }) as any,
    );

    const result = await controller.geocode({
      address: '1600 Amphitheatre Parkway, Mountain View, CA',
    });

    expect(result).toEqual({
      results: [],
      status: 'OK',
    });
  });

  it('should proxy reverse geocode requests with latitude and longitude', async () => {
    process.env.GOOGLE_GEOLOCATION_API_KEY = 'google-key';
    const getSpy = jest.spyOn(httpService, 'get').mockReturnValue(
      of({
        data: {
          results: [],
          status: 'OK',
        },
      }) as any,
    );

    await controller.geocode({
      latitude: 28.6139,
      longitude: 77.209,
    });

    expect(getSpy).toHaveBeenCalledWith(
      'https://maps.googleapis.com/maps/api/geocode/json',
      expect.objectContaining({
        params: expect.objectContaining({
          latlng: '28.6139,77.209',
        }),
      }),
    );
  });

  it('should fail when api key is missing', async () => {
    await expect(
      controller.geocode({
        address: '1600 Amphitheatre Parkway, Mountain View, CA',
      }),
    ).rejects.toThrow(HttpException);
  });

  it('should forward google geocode errors', async () => {
    process.env.GOOGLE_GEOLOCATION_API_KEY = 'google-key';
    jest.spyOn(httpService, 'get').mockReturnValue(
      throwError(() => ({
        response: {
          data: { error_message: 'bad request' },
          status: 400,
        },
      })) as any,
    );

    await expect(
      controller.geocode({
        address: '1600 Amphitheatre Parkway, Mountain View, CA',
      }),
    ).rejects.toThrow(HttpException);
  });

  it('should return flexible geocode response', async () => {
    process.env.GOOGLE_GEOLOCATION_API_KEY = 'google-key';
    jest.spyOn(httpService, 'get').mockReturnValue(
      of({
        data: {
          results: [
            {
              formatted_address: 'Delhi, India',
              address_components: [
                {
                  long_name: 'Delhi',
                  types: ['locality'],
                },
                {
                  long_name: 'Delhi',
                  types: ['administrative_area_level_1'],
                },
                {
                  long_name: '110001',
                  types: ['postal_code'],
                },
                {
                  long_name: 'India',
                  types: ['country'],
                },
              ],
            },
          ],
        },
      }) as any,
    );

    const result = await controller.geocodeFlexible({
      address: 'Delhi, India',
    });

    expect(result).toEqual({
      address: 'Delhi, India',
      state: 'Delhi',
      city: 'Delhi',
      postalCode: '110001',
      country: 'India',
    });
  });

  it('should return flexible geocode response for latitude and longitude', async () => {
    process.env.GOOGLE_GEOLOCATION_API_KEY = 'google-key';
    jest.spyOn(httpService, 'get').mockReturnValue(
      of({
        data: {
          results: [
            {
              formatted_address: 'Connaught Place, New Delhi, Delhi 110001, India',
              address_components: [
                {
                  long_name: 'New Delhi',
                  types: ['locality'],
                },
                {
                  long_name: 'Delhi',
                  types: ['administrative_area_level_1'],
                },
                {
                  long_name: '110001',
                  types: ['postal_code'],
                },
              ],
            },
          ],
        },
      }) as any,
    );

    const result = await controller.geocodeFlexible({
      latitude: 28.6315,
      longitude: 77.2167,
    });

    expect(result).toEqual({
      address: 'Connaught Place, New Delhi, Delhi 110001, India',
      state: 'Delhi',
      city: 'New Delhi',
      postalCode: '110001',
    });
  });

  // The Google proxies are billed per call against a shared API key, so they
  // must never be reachable without the same bearer token the measurement
  // endpoints require. Guard against a `@Public()` decorator creeping back in.
  describe('authentication', () => {
    const routes = ['geolocate', 'geocode', 'geocodeFlexible'] as const;

    it.each(routes)('does not expose %s publicly', (route) => {
      const isPublic = Reflect.getMetadata(
        IS_PUBLIC_KEY,
        GeolocationController.prototype[route],
      );

      expect(isPublic).toBeUndefined();
    });

    it.each(routes)('protects %s with the AuthGuard', (route) => {
      const guards =
        Reflect.getMetadata(
          GUARDS_METADATA,
          GeolocationController.prototype[route],
        ) ?? [];

      expect(guards).toContain(AuthGuard);
    });

    it('is not marked public at the controller level', () => {
      expect(
        Reflect.getMetadata(IS_PUBLIC_KEY, GeolocationController),
      ).toBeUndefined();
    });
  });
});
