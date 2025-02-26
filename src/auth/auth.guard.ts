import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { ValidateApiKeyDto } from './auth.dto';
import { HttpService } from '@nestjs/axios';
import { PUBLIC_URLs_LIST } from './auth.util';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly httpService: HttpService) { }

  private async TEMP_verifyPublicToken(token: string, request: any) {
    try {
      const tokenList = (JSON.parse(process.env.TEMP_GIGA_METER_PUBLIC_ACCESS_TOKEN ?? '[]') || []) as string[];
      const isValid = tokenList.find((t: string) => t === token);
      const isPublicAccess = PUBLIC_URLs_LIST.includes(request.path);

      if (isValid && isPublicAccess && request?.method === 'GET') {
        request.has_write_access = true;
      }

      return isValid;
    } catch (error) {
      console.error('Public token parse error', error.message);
      return false;
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const useAuth = process.env.USE_AUTH === 'true';

    if (!useAuth) return true;

    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new UnauthorizedException('Missing authorization token');
    }

    const response = await this.validateToken(token, request);
    if (!response) {
      throw new UnauthorizedException(
        'Invalid token or not authorized to access',
      );
    }
    return true;
  }

  private async validateToken(token: string, request: any): Promise<boolean> {
    try {
      if (process.env.GIGA_METER_APP_KEY === token) {
        request.has_write_access = true;
        request.is_super_user = true;
        return true;
      } else {

        // TEMPORARY CODE
        const isValid = await this.TEMP_verifyPublicToken(token, request);
        if (isValid) return true;

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
        const isPublicAccess = PUBLIC_URLs_LIST.includes(request.path); //request.path
        if (!request.has_write_access && !isPublicAccess) {
          return false;
        }
        if (request?.method == 'GET' && !response.data.data.has_write_access) {
          request.allowed_countries = response.data.data.countries.map(
            (c) => c.code,
          );
          request.allowed_countries_iso3 = response.data.data.countries.map(
            (c) => c.iso3_format,
          );
        }
        return true;
      }
    } catch (error) {
      console.error('Token validation failed:', error.message);
    }
  }
}
