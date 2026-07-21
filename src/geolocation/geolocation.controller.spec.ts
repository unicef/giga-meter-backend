import { HttpException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import { GeolocationController } from './geolocation.controller';

describe('GeolocationController', () => {
  let controller: GeolocationController;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GeolocationController],
      providers: [
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
            post: jest.fn(),
          },
        },
      ],
    }).compile();

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
});
