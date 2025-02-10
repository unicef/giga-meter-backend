import { ArgumentsHost, Catch, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { WithSentry } from '@sentry/nestjs';
import * as Sentry from '@sentry/node';
import { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter extends BaseExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    Sentry.captureException(exception);
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const message = exception.message.replace(/\n/g, '');

    switch (exception.code) {
      case 'P2002': {
        const status = HttpStatus.CONFLICT;
        response.status(status).json({
          errorType: 'PrismaClientKnownRequestError',
          statusCode: status,
          message: message,
          prismaExceptionCode: exception.code,
        });
        break;
      }
      case 'P2025': {
        const status = HttpStatus.NOT_FOUND;
        response.status(status).json({
          errorType: 'PrismaClientKnownRequestError',
          statusCode: status,
          message: message,
          prismaExceptionCode: exception.code,
        });
        break;
      }
      default:
        // default 500 error code
        const status = HttpStatus.INTERNAL_SERVER_ERROR;
        response.status(status).json({
          errorType: 'PrismaClientKnownRequestError',
          statusCode: status,
          message: message,
          prismaExceptionCode: exception.code,
        });
        break;
    }
  }
}

@Catch(Prisma.PrismaClientValidationError)
export class PrismaClientValidationErrorFilter extends BaseExceptionFilter {
  @WithSentry()
  catch(exception: Prisma.PrismaClientValidationError, host: ArgumentsHost) {
    Sentry.captureException(exception);
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const message = exception.message.replace(/\n/g, '');

    const status = HttpStatus.BAD_REQUEST;
    response.status(status).json({
      errorType: 'PrismaClientValidationError',
      statusCode: status,
      message: message,
    });
  }
}
