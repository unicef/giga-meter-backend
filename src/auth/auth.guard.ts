import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import * as jwksRsa from 'jwks-rsa';
import { Category, DEFAULT_CATEGORY } from '../common/category.config';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../common/public.decorator';
import { firstValueFrom } from 'rxjs';
import { ValidateApiKeyDto } from './auth.dto';
import { HttpService } from '@nestjs/axios';
import { CategoryConfigProvider } from '../common/category-config.provider';
import { ROLES_KEY } from 'src/roles/roles.decorator';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly httpService: HttpService,
    private readonly categoryConfigProvider: CategoryConfigProvider,
    private reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if the route is marked as public
    const request = context.switchToHttp().getRequest();
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const useAuth = process.env.USE_AUTH === 'true';
    const authHeader = request.headers.authorization;
    if (!useAuth) return true;

    // Check if it's a Bearer token or device token
    const parts: string[] = authHeader.split(' ');
    if (parts.length !== 2) {
      throw new UnauthorizedException('Invalid authorization header format');
    }

    const [scheme, token] = parts;

    // Handle Bearer tokens (existing logic)
    if (scheme.toLowerCase() === 'bearer') {
      if (request.headers?.tokentype === 'b2c') {
        const decodedToken: any = await this.validateB2cToken(token);
        if (!decodedToken) {
          throw new UnauthorizedException(
            'Invalid bearer token or not authorized to access for b2c',
          );
        }
        request.category = Category.ADMIN;
        request.b2cUser = decodedToken;

        const requiredRoles = this.reflector.getAllAndOverride<string[]>(
          ROLES_KEY,
          [context.getHandler(), context.getClass()],
        );

        if (requiredRoles) {
          const hasPermission = await this.validateUserRole(
            decodedToken.email,
            requiredRoles,
          );
          if (!hasPermission) {
            throw new ForbiddenException('Insufficient permissions');
          }
        }

        return true;
      }
    }

    // Bypass authentication for Prometheus metrics endpoint
    if (request.url === '/metrics') {
      return true;
    }
    // const token = request.headers.authorization?.split(' ')[1];

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

  private jwksClient = jwksRsa({
    cache: true,
    cacheMaxEntries: 5,
    timeout: 60000,
    cacheMaxAge: 3600000,
    jwksUri: process.env.B2C_JWKS_URI,
  });

  private async validateB2cToken(token: string) {
    return new Promise((resolve) => {
      jwt.verify(
        token,
        this.getSigningKey.bind(this),
        {
          algorithms: ['RS256'],
          audience: process.env.B2C_CLIENT_ID, // your client ID
          issuer: process.env.B2C_ISSUER_URL,
          clockTolerance: 30, // seconds
        },
        (err, decoded) => {
          if (err) {
            console.error('B2C token validation error:', err);
            resolve(null);
          } else resolve(decoded);
        },
      );
    });
  }

  private async validateUserRole(
    email: string,
    requiredRoles: string[],
  ): Promise<boolean> {
    if (requiredRoles.includes('')) return true;
    const user = await this.prisma.users.findFirst({
      where: { email },
      include: {
        roleAssignments: {
          where: { deleted: null },
          orderBy: { id: 'desc' },
          include: {
            role: {
              include: {
                rolePermissions: {
                  where: {
                    deleted: null,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) return false;
    if (!user.is_active)
      throw new UnauthorizedException("We can't seem to find your account.");
    const userPermissions =
      user.roleAssignments?.[0]?.role?.rolePermissions?.map?.(
        (role) => role.slug,
      ) || [];
    return requiredRoles.every((role) => userPermissions.includes(role));
  }

  private getSigningKey(header: any, callback: any) {
    this.jwksClient.getSigningKey(header.kid, (err, key) => {
      if (err) return callback(err, null);
      callback(null, key.getPublicKey());
    });
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
      console.error('Token validation failed:', error.message);
      return false;
    }
  }
}
