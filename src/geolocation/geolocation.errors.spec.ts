import { HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { of, throwError } from 'rxjs';
import { GeolocationController } from './geolocation.controller';
import {
  CIRCUIT_FAILURE_THRESHOLD,
  GeolocationCircuit,
} from './geolocation.circuit';

/** Minimal valid body, so these tests exercise the error mapping and nothing else. */
const BODY = {
  considerIp: false,
  wifiAccessPoints: [{ macAddress: '00:11:22:33:44:55', signalStrength: -60 }],
};

describe('Geolocation upstream error mapping', () => {
  let controller: GeolocationController;
  let httpService: HttpService;
  let circuit: GeolocationCircuit;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GeolocationController],
      providers: [
        GeolocationCircuit,
        {
          provide: HttpService,
          useValue: { get: jest.fn(), post: jest.fn() },
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(GeolocationController);
    httpService = module.get(HttpService);
    circuit = module.get(GeolocationCircuit);
    process.env.GOOGLE_GEOLOCATION_API_KEY = 'google-key';
  });

  afterEach(() => {
    delete process.env.GOOGLE_GEOLOCATION_API_KEY;
  });

  const rejectPostWith = (error: unknown) =>
    jest.spyOn(httpService, 'post').mockReturnValue(throwError(() => error) as any);

  const statusOf = async (promise: Promise<unknown>): Promise<number> => {
    const error = await promise.catch((e) => e);
    expect(error).toBeInstanceOf(HttpException);
    return (error as HttpException).getStatus();
  };

  it('keeps the missing-api-key failure as a 500 instead of losing it', async () => {
    delete process.env.GOOGLE_GEOLOCATION_API_KEY;
    const postSpy = jest.spyOn(httpService, 'post');

    const error = await controller.geolocate(BODY as any).catch((e) => e);

    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect((error as HttpException).message).toContain('not configured');
    expect(postSpy).not.toHaveBeenCalled();
  });

  it('answers 422, not 404, when the provider finds no match', async () => {
    rejectPostWith({ response: { status: 404, data: { error: 'notFound' } } });

    expect(await statusOf(controller.geolocate(BODY as any))).toBe(
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  });

  it('answers 502, not 403, when the provider rejects our key', async () => {
    // A forwarded 403 was indistinguishable from "the caller's token is invalid".
    rejectPostWith({
      response: { status: 403, data: { error: { message: 'API key not valid' } } },
    });

    expect(await statusOf(controller.geolocate(BODY as any))).toBe(
      HttpStatus.BAD_GATEWAY,
    );
  });

  it('answers 503 when the provider rate limits us', async () => {
    rejectPostWith({ response: { status: 429, data: {} } });

    expect(await statusOf(controller.geolocate(BODY as any))).toBe(
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  });

  it('answers 502 when the provider itself fails', async () => {
    rejectPostWith({ response: { status: 500, data: {} } });

    expect(await statusOf(controller.geolocate(BODY as any))).toBe(
      HttpStatus.BAD_GATEWAY,
    );
  });

  it('answers 504 on a timeout', async () => {
    rejectPostWith({ code: 'ECONNABORTED', message: 'timeout of 8000ms exceeded' });

    expect(await statusOf(controller.geolocate(BODY as any))).toBe(
      HttpStatus.GATEWAY_TIMEOUT,
    );
  });

  it.each(['ENOTFOUND', 'ECONNREFUSED', 'EAI_AGAIN', 'ECONNRESET'])(
    'answers 502 when the provider is unreachable (%s)',
    async (code) => {
      rejectPostWith({ code, message: code });

      expect(await statusOf(controller.geolocate(BODY as any))).toBe(
        HttpStatus.BAD_GATEWAY,
      );
    },
  );

  it('never leaks the provider response body to the caller', async () => {
    rejectPostWith({
      response: {
        status: 403,
        data: { error: { message: 'API key not valid. Project 12345' } },
      },
    });

    const error = (await controller
      .geolocate(BODY as any)
      .catch((e) => e)) as HttpException;

    expect(JSON.stringify(error.getResponse())).not.toContain('12345');
  });

  describe('circuit breaker', () => {
    const timeout = { code: 'ECONNABORTED', message: 'timeout' };

    it('fails fast with 503 after repeated upstream failures', async () => {
      rejectPostWith(timeout);
      for (let i = 0; i < CIRCUIT_FAILURE_THRESHOLD; i++) {
        await controller.geolocate(BODY as any).catch(() => undefined);
      }
      const postSpy = jest.spyOn(httpService, 'post');
      postSpy.mockClear();

      expect(await statusOf(controller.geolocate(BODY as any))).toBe(
        HttpStatus.SERVICE_UNAVAILABLE,
      );
      // The point of the breaker: no socket is opened while it is open.
      expect(postSpy).not.toHaveBeenCalled();
    });

    it('does not open on provider answers that are not its fault', async () => {
      rejectPostWith({ response: { status: 404, data: {} } });
      for (let i = 0; i < CIRCUIT_FAILURE_THRESHOLD + 2; i++) {
        await controller.geolocate(BODY as any).catch(() => undefined);
      }

      expect(circuit.isOpen()).toBe(false);
    });

    it('closes again after a success', async () => {
      rejectPostWith(timeout);
      for (let i = 0; i < CIRCUIT_FAILURE_THRESHOLD - 1; i++) {
        await controller.geolocate(BODY as any).catch(() => undefined);
      }
      jest
        .spyOn(httpService, 'post')
        .mockReturnValue(of({ data: { location: { lat: 1, lng: 2 } } }) as any);

      await controller.geolocate(BODY as any);

      expect(circuit.isOpen()).toBe(false);
    });
  });
});
