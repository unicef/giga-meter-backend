import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { Prisma } from '@prisma/client';
import { isClientError } from './error-reporting';
@Catch()
export class AllExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : isRecordNotFound(exception)
          ? HttpStatus.NOT_FOUND
          : HttpStatus.INTERNAL_SERVER_ERROR;

    // 4xx responses are not faults of ours. Anything else is reported,
    // including an exception built with a missing or odd status.
    if (!isClientError(httpStatus)) {
      Sentry.captureException(exception);
    }
    response.status(httpStatus).json({
      statusCode: httpStatus,
      message: exception?.message,
    });
  }
}

/**
 * Prisma's P2025: a findFirstOrThrow (or an update/delete) on a record that
 * does not exist. The services lean on it for ids that come from the caller,
 * so it means "no such school/country/user", not a fault of ours.
 */
const isRecordNotFound = (exception: unknown): boolean =>
  exception instanceof Prisma.PrismaClientKnownRequestError &&
  exception.code === 'P2025';
