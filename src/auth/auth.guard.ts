import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import * as jwksRsa from 'jwks-rsa';

import { Category, DEFAULT_CATEGORY } from '../common/category.config';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../common/public.decorator';
import { firstValueFrom } from 'rxjs';
import { ValidateApiKeyDto } from './auth.dto';
import { HttpService } from '@nestjs/axios';
import { DeviceTokenService } from './device-token.service';
import { NonceService } from './nonce.service';
import { HmacSignatureService } from './hmac-signature.service';
import { CategoryConfigProvider } from '../common/category-config.provider';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly categoryConfigProvider: CategoryConfigProvider,
    private readonly deviceTokenService: DeviceTokenService,
    private readonly nonceService: NonceService,
    private readonly hmacSignatureService: HmacSignatureService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if the route is marked as public
    const request = context.switchToHttp().getRequest();
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const isMetrics = request.url === '/metrics';
    const useAuth = process.env.USE_AUTH === 'true';

    if (!useAuth || isPublic || request.category || isMetrics) {
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
      if (request.headers?.tokentype === 'b2c') {
        const response = await this.validateB2cToken(token);
        if (!response) {
          throw new UnauthorizedException(
            'Invalid bearer token or not authorized to access for b2c',
          );
        }
        request.category = Category.ADMIN;
        request.b2cUser = response;
        return true;
      } else {
        const response = await this.validateToken(token, request);
        if (!response) {
          throw new UnauthorizedException(
            'Invalid bearer token or not authorized to access',
          );
        }
        return true;
      }
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

    throw new UnauthorizedException(
      'Unsupported authorization scheme. Use Bearer or Device',
    );
  }

  private jwksClient = jwksRsa({
    cache: true,
    cacheMaxEntries: 5,
    jwksUri: `https://unicefpartners.b2clogin.com/unicefpartners.onmicrosoft.com/B2C_1_UNICEF_SOCIAL_signup_signin/discovery/v2.0/keys`,
  });

  private async validateB2cToken(token: string) {
    return new Promise((resolve) => {
      jwt.verify(
        token,
        this.getSigningKey.bind(this),
        {
          algorithms: ['RS256'],
          audience: '67c00d3b-40d4-4ce0-b94c-a51ed891e80b', // your client ID
          issuer:
            'https://unicefpartners.b2clogin.com/48e05529-88b8-40e1-825a-18c4e1077b3a/v2.0/',
        },
        (err, decoded) => {
          if (err) resolve(null);
          else resolve(decoded);
        },
      );
    });
  }

  private getSigningKey(header: any, callback: any) {
    this.jwksClient.getSigningKey(header.kid, (err, key) => {
      if (err) return callback(err, null);
      callback(null, key.getPublicKey());
    });
  }

  /**
   * Validates device token and nonce, then sets request context
   */
  private async validateDeviceToken(
    token: string,
    request: any,
  ): Promise<boolean> {
    try {
      // First, validate the device token
      const payload = await this.deviceTokenService.validateToken(token);
      if (!payload) {
        return false;
      }

      // Extract nonce from request headers
      const nonce = request.headers['x-device-nonce'];
      if (!nonce) {
        this.logger.warn('Device token request missing required nonce header');
        throw new UnauthorizedException(
          'Missing x-device-nonce header for device token authentication',
        );
      }

      // Validate nonce format
      if (!this.nonceService.isValidNonceFormat(nonce)) {
        this.logger.warn('Invalid nonce format provided');
        throw new UnauthorizedException('Invalid nonce format');
      }

      // Validate and consume the nonce (prevents replay attacks)
      const nonceValidation = await this.nonceService.validateAndConsumeNonce(
        nonce,
        payload.deviceId,
      );
      if (!nonceValidation.isValid) {
        this.logger.warn(`Nonce validation failed: ${nonceValidation.reason}`);
        throw new UnauthorizedException(
          `Nonce validation failed: ${nonceValidation.reason}`,
        );
      }

      // Validate HMAC signature for request integrity
      const hmacValidation =
        await this.hmacSignatureService.validateRequestIntegrity(
          request,
          token,
          nonce,
        );
      if (!hmacValidation.isValid) {
        this.logger.warn(
          `HMAC signature validation failed: ${hmacValidation.reason}`,
        );
        throw new UnauthorizedException(
          `HMAC signature validation failed: ${hmacValidation.reason}`,
        );
      }

      // Set device-specific context on request
      request.deviceId = payload.deviceId;
      request.nonce = nonce;
      request.tokenType = 'device';
      request.category = Category.GIGA_METER.toLowerCase();
      request.has_write_access = true;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error; // Re-throw auth errors as-is
      }
      this.logger.error('Device token validation failed:', error.message);
      return false;
    }
  }

  /**
   * Normal flow: Validates API key and sets request context
   */
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
        (!response.data.data.has_write_access /*request?.method != 'GET' ||*/ &&
          response.data.data.countries?.length === 0)
      ) {
        return false;
      }

      request.has_write_access = response.data.data.has_write_access;
      const apiCategory = response?.data?.data?.apiCategory?.code;
      // Extract and set the category from the response
      //TODO:// remove this logic after swagger categories are added
      request.category = (
        apiCategory
          ? apiCategory
          : request.has_write_access
            ? Category.GIGA_METER
            : DEFAULT_CATEGORY
      ).toLowerCase();

      //TODO:// remove this logic after swagger categories are added
      if (request?.method == 'GET' && !response.data.data.has_write_access) {
        request.allowed_countries = response.data.data.countries.map(
          (c) => c.code,
        );
        request.allowed_countries_iso3 = response.data.data.countries.map(
          (c) => c.iso3_format,
        );
        request.allowed_countries_map = response.data.data.countries.reduce(
          (acc, country) => {
            acc[country.code] = country.iso3_format;
            return acc;
          },
          {},
        );
      }
      const config = await this.categoryConfigProvider.getCategoryConfig(
        request.category,
      );
      request.category_allowed_countries = config?.allowedCountries ?? [];

      return true;
    } catch (error) {
      this.logger.error(`Token validation failed: ${error.message}`);
      return false;
    }
  }
}
