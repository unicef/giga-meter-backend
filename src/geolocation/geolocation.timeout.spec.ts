import { createServer, Server, ServerResponse } from 'http';
import { AddressInfo } from 'net';
import { HttpException, HttpStatus } from '@nestjs/common';
import { HttpModule, HttpService } from '@nestjs/axios';
import { Test } from '@nestjs/testing';
import { GeolocationController } from './geolocation.controller';
import { GeolocationModule, GOOGLE_API_TIMEOUT_MS } from './geolocation.module';
import { PrismaService } from '../prisma/prisma.service';

describe('Geolocation upstream timeout', () => {
  afterEach(() => {
    delete process.env.GOOGLE_GEOLOCATION_API_KEY;
  });

  it('configures a timeout on the HttpService the module provides', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [GeolocationModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    const httpService = moduleRef.get(HttpService);

    expect(httpService.axiosRef.defaults.timeout).toBe(GOOGLE_API_TIMEOUT_MS);
    // The Windows client stops waiting after 10 s: the backend must answer first.
    expect(GOOGLE_API_TIMEOUT_MS).toBeLessThan(10_000);
  });

  describe('when Google never answers', () => {
    // Accepts the connection and never writes a response.
    let server: Server;
    const openResponses: ServerResponse[] = [];
    let url: string;

    beforeAll(async () => {
      server = createServer((_req, res) => {
        openResponses.push(res);
      });
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
      url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/geolocate`;
    });

    afterAll(async () => {
      openResponses.forEach((res) => res.destroy());
      await new Promise<void>((resolve) => server.close(() => resolve()));
    });

    it('fails with 504 once the timeout expires instead of hanging', async () => {
      process.env.GOOGLE_GEOLOCATION_API_KEY = 'google-key';
      // Same controller, with a short timeout so the test does not wait 8 s.
      const moduleRef = await Test.createTestingModule({
        imports: [HttpModule.register({ timeout: 200 })],
        controllers: [GeolocationController],
      }).compile();
      const controller = moduleRef.get(GeolocationController);
      Object.defineProperty(controller, 'googleApiUrl', { value: url });

      const startedAt = Date.now();
      const error = await controller
        .geolocate({ considerIp: false, wifiAccessPoints: [] })
        .catch((e) => e);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(HttpStatus.GATEWAY_TIMEOUT);
      expect(Date.now() - startedAt).toBeLessThan(2_000);
      expect(openResponses.length).toBeGreaterThan(0); // the request did reach the server
    });
  });
});
