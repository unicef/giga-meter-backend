import {
  ArgumentsHost,
  BadGatewayException,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { Prisma } from '@prisma/client';
import { AllExceptionFilter } from './common.filter';

jest.mock('@sentry/node', () => ({ captureException: jest.fn() }));

const mockHost = () => {
  const response = { status: jest.fn(), json: jest.fn() };
  response.status.mockReturnValue(response);
  const host = {
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost;
  return { host, response };
};

describe('AllExceptionFilter', () => {
  const filter = new AllExceptionFilter();

  beforeEach(() => jest.clearAllMocks());

  it('does not report client errors to Sentry', () => {
    const { host, response } = mockHost();

    filter.catch(new NotFoundException('Cannot GET /'), host);
    filter.catch(
      new HttpException(
        'No location matches the data provided',
        HttpStatus.UNPROCESSABLE_ENTITY,
      ),
      host,
    );

    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  });

  it('answers a Prisma record-not-found as a 404 without reporting it', () => {
    const { host, response } = mockHost();
    // What findFirstOrThrow throws for a giga_id_school nobody has.
    const exception = new Prisma.PrismaClientKnownRequestError(
      'No school found',
      { code: 'P2025', clientVersion: '5.14.0' },
    );

    filter.catch(exception, host);

    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
  });

  it('still reports other Prisma errors as 500s', () => {
    const { host, response } = mockHost();
    const exception = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      { code: 'P2002', clientVersion: '5.14.0' },
    );

    filter.catch(exception, host);

    expect(Sentry.captureException).toHaveBeenCalledWith(exception);
    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  });

  it('reports server errors to Sentry', () => {
    const { host, response } = mockHost();
    const exception = new BadGatewayException();

    filter.catch(exception, host);

    expect(Sentry.captureException).toHaveBeenCalledWith(exception);
    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_GATEWAY);
  });

  it('reports an HttpException built without a status', () => {
    const { host } = mockHost();
    // As ping-aggregation.service does with `error.status` from a Prisma error.
    const exception = new HttpException('Internal server error', undefined);

    filter.catch(exception, host);

    expect(Sentry.captureException).toHaveBeenCalledWith(exception);
  });

  it('reports unexpected non-HTTP errors to Sentry as 500s', () => {
    const { host, response } = mockHost();
    const exception = new Error('boom');

    filter.catch(exception, host);

    expect(Sentry.captureException).toHaveBeenCalledWith(exception);
    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(response.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'boom',
    });
  });
});
