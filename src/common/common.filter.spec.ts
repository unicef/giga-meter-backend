import {
  Controller,
  Get,
  INestApplication,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as Sentry from '@sentry/node';
import * as request from 'supertest';
import { AllExceptionFilter } from './common.filter';
import { LocationNotFoundException } from '../geolocation/location-not-found.exception';

jest.mock('@sentry/node', () => ({ captureException: jest.fn() }));

@Controller('things')
class ThingsController {
  @Get('missing')
  missing() {
    throw new NotFoundException('Thing not found');
  }

  @Get('unplaceable')
  unplaceable() {
    throw new LocationNotFoundException();
  }

  @Get('broken')
  broken() {
    throw new Error('Database connection lost');
  }
}

// Through a real app, because whether a route matched is something only
// Express knows.
describe('AllExceptionFilter', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ThingsController],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalFilters(new AllExceptionFilter());
    await app.init();
  });

  afterAll(() => app.close());

  beforeEach(() => jest.clearAllMocks());

  it('does not report a request for a path no route serves', async () => {
    await request(app.getHttpServer())
      .get('/')
      .expect(404, { statusCode: 404, message: 'Cannot GET /' });

    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('still reports a 404 thrown by a handler', async () => {
    await request(app.getHttpServer()).get('/things/missing').expect(404);

    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.any(NotFoundException),
    );
  });

  it('does not report access points the provider cannot place', async () => {
    await request(app.getHttpServer()).get('/things/unplaceable').expect(422, {
      statusCode: 422,
      message: 'No location matches the data provided',
    });

    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('reports server errors', async () => {
    await request(app.getHttpServer()).get('/things/broken').expect(500);

    expect(Sentry.captureException).toHaveBeenCalledWith(expect.any(Error));
  });
});
