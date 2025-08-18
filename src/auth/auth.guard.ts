import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Category, DEFAULT_CATEGORY } from '../common/category.config';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../common/public.decorator';
import { firstValueFrom } from 'rxjs';
import { ValidateApiKeyDto } from './auth.dto';
import { HttpService } from '@nestjs/axios';
import { DeviceTokenService } from './device-token.service';



@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly httpService: HttpService, 
    private readonly deviceTokenService: DeviceTokenService,
    private reflector: Reflector
  ) { }

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

    // Bypass authentication for Prometheus metrics endpoint
    if (request.url === '/metrics') {
      return true;
    }

    // Extract token from Authorization header
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Missing authorization token');
    }

    // Check if it's a Bearer token or device token
    const parts = authHeader.split(' ');
    if (parts.length !== 2) {
      throw new UnauthorizedException('Invalid authorization header format');
    }

    const [scheme, token] = parts;
    
    // Handle Bearer tokens (existing logic)
    if (scheme.toLowerCase() === 'bearer') {
      const response = await this.validateToken(token, request);
      if (!response) {
        throw new UnauthorizedException(
          'Invalid bearer token or not authorized to access',
        );
      }
      return true;
    }
    
    // Handle Device tokens (new logic)
    if (scheme.toLowerCase() === 'device') {
      const isValid = await this.validateDeviceToken(token, request);
      if (!isValid) {
        throw new UnauthorizedException(
          'Invalid device token or not authorized to access',
        );
      }
      return true;
    }

    throw new UnauthorizedException('Unsupported authorization scheme. Use Bearer or Device');
  }

  /**
   * Validates device token and sets request context
   * @param token - Device token to validate
   * @param request - HTTP request object
   * @returns Promise<boolean> indicating if token is valid
   */
  private async validateDeviceToken(token: string, request: any): Promise<boolean> {
    try {
      const payload = await this.deviceTokenService.validateToken(token);
      if (!payload) {
        return false;
      }

      // Set device-specific context on request
      request.deviceId = payload.deviceId;
      request.category = Category.GIGA_METER.toLowerCase();
      return true;
    } catch (error) {
      console.error('Device token validation failed:', error.message);
      return false;
    }
  }

  public async validateToken(token: string, request: any): Promise<boolean> {
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
          (/*request?.method != 'GET' ||*/
            response.data.data.countries?.length === 0))
      ) {
        return false;
      }

      request.has_write_access = response.data.data.has_write_access;
      const apiCategory = response?.data?.data?.apiCategory?.code;
      // Extract and set the category from the response
      //TODO:// remove this logic after swagger categories are added 
      request.category = (apiCategory ? apiCategory : request.has_write_access ? Category.GIGA_METER : DEFAULT_CATEGORY).toLowerCase();

      //TODO:// remove this logic after swagger categories are added 
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
