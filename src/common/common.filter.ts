import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { SentryExceptionCaptured } from '@sentry/nestjs';

@Catch()
export class AllExceptionFilter implements ExceptionFilter {
  @SentryExceptionCaptured()
  catch(exception: any, host: ArgumentsHost): void {
    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // @SentryExceptionCaptured captures non-HttpExceptions automatically.
    // HttpExceptions are skipped by the decorator, so capture them manually
    // with a hint and tags.
    if (exception instanceof HttpException) {
      Sentry.withScope((scope) => {
        scope.setTag('http.status_code', String(httpStatus));
        scope.setTag('exception.type', exception.constructor.name);
        Sentry.captureException(exception, {
          originalException: exception,
          mechanism: { type: 'generic', handled: true },
        });
      });
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : exception?.message ?? 'Internal server error';

    response.status(httpStatus).json({
      statusCode: httpStatus,
      message,
    });
  }
}
