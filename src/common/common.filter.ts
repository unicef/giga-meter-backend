import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { WithSentry } from '@sentry/nestjs';
import * as Sentry from '@sentry/node';

@Catch()
export class AllExceptionFilter implements ExceptionFilter {
  @WithSentry()
  catch(exception: any, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    if (
      exception instanceof HttpException &&
      (httpStatus === HttpStatus.BAD_REQUEST ||
        httpStatus === HttpStatus.UNAUTHORIZED ||
        httpStatus === HttpStatus.FORBIDDEN ||
        httpStatus === HttpStatus.NOT_FOUND ||
        httpStatus === HttpStatus.METHOD_NOT_ALLOWED)
    ) {
      response.status(httpStatus).json({
        statusCode: httpStatus,
        message: exception.message,
      });
    } else {
      Sentry.captureException(exception);
      response.status(httpStatus).json({
        statusCode: httpStatus,
        message: 'Internal server error',
      });
    }
  }
}
