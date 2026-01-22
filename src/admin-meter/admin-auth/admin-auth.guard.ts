import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import * as jwksRsa from 'jwks-rsa';
import { PrismaService } from 'src/prisma/prisma.service';
import { ROLES_KEY } from '../roles/roles.decorator';
import { IS_ADMIN_KEY } from 'src/common/admin.decorator';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const isAdmin = this.reflector.getAllAndOverride<boolean>(IS_ADMIN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!isAdmin) {
      return true;
    }

    const authHeader = request.headers.authorization;
    // Check if it's a Bearer token or device token
    const parts: string[] = authHeader.split(' ');
    if (parts.length !== 2) {
      throw new UnauthorizedException('Invalid authorization header format');
    }

    const [scheme, token] = parts;
    if (scheme.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedException('Missing authorization token');
    }

    // Handle Bearer tokens (existing logic)
    const decodedToken: any = await this.validateB2cToken(token);
    if (!decodedToken) {
      throw new UnauthorizedException(
        'Invalid bearer token or not authorized to access for b2c',
      );
    }
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
      if (!hasPermission.permitionSuccess) {
        throw new ForbiddenException('Insufficient permissions');
      }
      request.user = hasPermission.userData;
    } else {
      throw new ForbiddenException('No roles found.');
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
  ): Promise<{ permitionSuccess: boolean; userData: any }> {
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
    if (requiredRoles.includes(''))
      return { permitionSuccess: true, userData: user };
    if (!user) return { permitionSuccess: false, userData: null };
    if (!user.is_active)
      throw new UnauthorizedException("We can't seem to find your account.");

    const userPermissions =
      user.roleAssignments?.[0]?.role?.rolePermissions?.map?.(
        (role) => role.slug,
      ) || [];
    return {
      permitionSuccess: requiredRoles.every((role) =>
        userPermissions.includes(role),
      ),
      userData: user,
    };
  }

  private getSigningKey(header: any, callback: any) {
    this.jwksClient.getSigningKey(header.kid, (err, key) => {
      if (err) return callback(err, null);
      callback(null, key.getPublicKey());
    });
  }
}
