import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { LocationNotFoundException } from '../geolocation/location-not-found.exception';
@Catch()
export class AllExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    if (!isExpected(exception, ctx.getRequest())) {
      Sentry.captureException(exception);
    }
    response.status(httpStatus).json({
      statusCode: httpStatus,
      message: exception?.message,
    });
  }
}

/** Answers given on purpose, which are not failures and stay out of Sentry. */
function isExpected(exception: unknown, request: { route?: unknown }): boolean {
  return (
    // Nest's "Cannot GET /" for a path no route serves: probes and scanners.
    // Express sets request.route only once a route matched, so a 404 thrown by
    // one of our handlers is still reported.
    (exception instanceof NotFoundException && !request.route) ||
    exception instanceof LocationNotFoundException
  );
}
