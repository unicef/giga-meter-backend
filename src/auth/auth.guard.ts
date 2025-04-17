import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { DEFAULT_CATEGORY } from '../common/category.config';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../common/public.decorator';
import { firstValueFrom } from 'rxjs';
import { ValidateApiKeyDto } from './auth.dto';
import { HttpService } from '@nestjs/axios';



@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly httpService: HttpService, private reflector: Reflector) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if the route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

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

  public async validateToken(token: string, request: any): Promise<boolean> {
    try {
      if (process.env.GIGA_METER_APP_KEY === token) {
        request.has_write_access = true;
        request.is_super_user = true;
        request.category = 'giga_meter'; // Set category as giga_meter for the master key
        return true;
      } else {
        const url = `${process.env.PROJECT_CONNECT_SERVICE_URL}/api/v1/validate_api_key/${process.env.DAILY_CHECK_APP_API_CODE}`;
        const response = await firstValueFrom(
          this.httpService.get<ValidateApiKeyDto>(url, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        );
        if (
          !response.data.success ||
          (!response.data.data.has_write_access &&
            (/*request?.method != 'GET' ||*/
            response.data.data.countries?.length === 0))
        ) {
          return false;
        }

        request.has_write_access = response.data.data.has_write_access;
        const apiCategory = response?.data?.data?.apiCategory?.code;
        // Extract and set the category from the response
        request.category = (apiCategory ?? request.has_write_access ? 'giga_apps' : DEFAULT_CATEGORY).toLowerCase();

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
      return false;
    }
  }
}
