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
});
