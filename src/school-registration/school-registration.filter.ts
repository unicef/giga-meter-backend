import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Catch()
export class SchoolRegistrationExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const httpException =
      exception instanceof HttpException ? exception : null;
    const status = httpException?.getStatus() ?? HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = httpException?.getResponse();

    response.status(status).json({
      statusCode: status,
      message: this.extractMessage(exception, exceptionResponse),
    });
  }

  private extractMessage(exception: unknown, exceptionResponse: unknown) {
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    if (
      exceptionResponse &&
      typeof exceptionResponse === 'object' &&
      'message' in exceptionResponse
    ) {
      return (exceptionResponse as { message: unknown }).message;
    }

    return exception instanceof Error
      ? exception.message
      : 'Internal server error';
  }
}
