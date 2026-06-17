import { CanActivate, Injectable, NotFoundException } from '@nestjs/common';

/**
 * Guard that only lets a route through when the service is running in the
 * staging environment (NODE_ENV === 'staging').
 *
 * Outside staging it throws a NotFoundException so the endpoint is completely
 * invisible in production (same response as an unknown route), rather than
 * advertising its existence with a 403.
 */
@Injectable()
export class StagingGuard implements CanActivate {
  canActivate(): boolean {
    if (process.env.NODE_ENV !== 'staging') {
      throw new NotFoundException();
    }
    return true;
  }
}
