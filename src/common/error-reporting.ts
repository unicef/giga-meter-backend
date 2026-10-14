import { HttpException } from '@nestjs/common';
import * as Sentry from '@sentry/node';

/** A 4xx: the caller's mistake (unknown route, bad input, no match), not ours. */
export const isClientError = (status: unknown): boolean =>
  typeof status === 'number' && status >= 400 && status < 500;

/**
 * Sends an error to Sentry unless it is a client error. Catch blocks that turn
 * whatever went wrong into a 4xx response call this first, because the global
 * filter does not report 4xx responses and the real cause would be lost.
 */
export const reportUnexpectedError = (error: unknown): void => {
  if (error instanceof HttpException && isClientError(error.getStatus())) {
    return;
  }
  Sentry.captureException(error);
};
