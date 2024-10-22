import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { ValidateApiKeyDto } from './auth.dto';
import { HttpService } from '@nestjs/axios';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly httpService: HttpService,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const useAuth = process.env.USE_AUTH === 'true';

    if (!useAuth) return true;

    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new UnauthorizedException('Missing authorization token');
    }

    let isValid = false;

    // First, try to validate as a JWT token
    try {
      this.jwtService.verify(token);

      // For self-generated tokens, grant full access
      request.has_write_access = true;
      request.allowed_countries = null; // Indicates access to all countries
      request.allowed_countries_iso3 = null; // Indicates access to all countries
      isValid = true;
    } catch (error) {
      // If JWT validation fails, try the external service
      isValid = await this.validateToken(token, request);
    }

    if (!isValid) {
      throw new UnauthorizedException(
        'Invalid token or not authorized to access',
      );
    }
    return true;
  }

  private async validateToken(token: string, request: any): Promise<boolean> {
    try {
      const url = `${process.env.PROJECT_CONNECT_SERVICE_URL}/api/v1/validate_api_key/${process.env.DAILY_CHECK_APP_API_CODE}`;
      const response = await firstValueFrom(
        this.httpService.get<ValidateApiKeyDto>(url, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      );

      if (
        !response.data.success ||
        (!response.data.data.has_write_access &&
          (request?.method != 'GET' ||
            response.data.data.countries?.length === 0))
      ) {
        return false;
      }

      request.has_write_access = response.data.data.has_write_access;
      if (request?.method == 'GET' && !response.data.data.has_write_access) {
        request.allowed_countries = response.data.data.countries.map(
          (c) => c.code,
        );
        request.allowed_countries_iso3 = response.data.data.countries.map(
          (c) => c.iso3_format,
        );
      }
      return true;
    } catch (error) {
      console.error('Token validation failed:', error.message);
      return false;
    }
  }
}
