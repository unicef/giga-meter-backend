import {
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class SchoolRegistrationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expectedToken = process.env.GIGA_SYNC_AUTH_TOKEN;

    if (!expectedToken) {
      throw new InternalServerErrorException(
        'GIGA_SYNC_AUTH_TOKEN is not configured',
      );
    }

    const request = context.switchToHttp().getRequest();
    const authorizationHeader = request.headers.authorization;

    if (!authorizationHeader) {
      throw new UnauthorizedException('Missing authorization token');
    }

    const providedToken = authorizationHeader.startsWith('Bearer ')
      ? authorizationHeader.slice(7).trim()
      : authorizationHeader.trim();

    if (providedToken !== expectedToken) {
      throw new UnauthorizedException('Invalid giga sync token');
    }

    return true;
  }
}
