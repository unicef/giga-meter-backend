import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * The provider has no location for the access points given. An answer, not a
 * failure, so the exception filter keeps it out of Sentry.
 */
export class LocationNotFoundException extends HttpException {
  constructor() {
    super(
      'No location matches the data provided',
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}
