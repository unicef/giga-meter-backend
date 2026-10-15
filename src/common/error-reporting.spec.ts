import {
  BadRequestException,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { isClientError, reportUnexpectedError } from './error-reporting';

jest.mock('@sentry/node', () => ({ captureException: jest.fn() }));

describe('error-reporting', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('isClientError', () => {
    it('is true only for 4xx statuses', () => {
      expect(isClientError(400)).toBe(true);
      expect(isClientError(499)).toBe(true);
      expect(isClientError(399)).toBe(false);
      expect(isClientError(500)).toBe(false);
      expect(isClientError(undefined)).toBe(false);
      expect(isClientError('404')).toBe(false);
    });
  });

  describe('reportUnexpectedError', () => {
    it('skips client errors', () => {
      reportUnexpectedError(new NotFoundException());
      reportUnexpectedError(new BadRequestException());

      expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    it('reports server errors and anything that is not an HttpException', () => {
      const serverError = new HttpException('down', HttpStatus.BAD_GATEWAY);
      const dbError = new Error("Can't reach database server");

      reportUnexpectedError(serverError);
      reportUnexpectedError(dbError);

      expect(Sentry.captureException).toHaveBeenCalledWith(serverError);
      expect(Sentry.captureException).toHaveBeenCalledWith(dbError);
    });
  });
});
