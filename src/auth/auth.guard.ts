import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ValidateApiKeyDto } from './auth.dto';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly httpService: HttpService) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.split(' ')[1];

    if (!token) {
      return throwError(
        () => new UnauthorizedException('Missing authorization token'),
      );
    }

    return this.validateToken(token).pipe(
      map((isValid) => isValid),
      catchError((error) => throwError(error)),
    );
  }

  private validateToken(token: string): Observable<boolean> {
    try {
      const url = `${process.env.PROJECT_CONNECT_SERVICE_URL}/api/v1/validate_api_key/${process.env.DAILY_CHECK_APP_API_CODE}`;
      return this.httpService
        .get<ValidateApiKeyDto>(url, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .pipe(
          map((response) => response.data.success), // Adapt to your API response structure
          catchError((error) =>
            throwError(
              () =>
                new UnauthorizedException(
                  'Invalid token or token validation error: ' + error,
                ),
            ),
          ),
        );
    } catch (error) {
      console.error('Token validation failed:', error.message);
    }
  }
}
