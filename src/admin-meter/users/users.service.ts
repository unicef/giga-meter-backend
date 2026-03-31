import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PERMISSION_SLUGS, ROLES } from 'src/admin-meter/roles/roles.constants';
import { GetUsersQueryDto, UpdateUserDto } from './users.dto';
import { Prisma, SpeedTestProtocol } from '@prisma/client';
import {
  CACHE_INVALIDATE_KEYS,
  CMS_DATA_CACHE_KEY,
} from 'src/config/cache.config';
import redisClient from 'src/utils/redis.client';

type TypeRoles = {
  id: number;
  name: string;
  rolePermissions: { id: number; slug: string }[];
};

@Injectable()
export class UsersService {
  private logger = new Logger(UsersService.name);
  constructor(private prisma: PrismaService) {}

  async getUsers(query: GetUsersQueryDto) {
    const { page, limit, search } = query;
    if (!page || !limit)
      throw new BadRequestException('page and page_size are required');
    const skip = (page - 1) * limit;

    const where: Prisma.UsersWhereInput = search
      ? {
          OR: [
            { first_name: { contains: search, mode: 'insensitive' } },
            { last_name: { contains: search, mode: 'insensitive' } },
            { username: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.users.findMany({
        where,
        skip,
        take: parseInt(limit.toString()),
        include: {
          roleAssignments: {
            where: { deleted: null },
            include: {
              role: {
                include: {
                  rolePermissions: {
                    where: { deleted: null },
                    select: { id: true, slug: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { id: 'desc' },
      }),
      this.prisma.users.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserById(id: number) {
    const user = await this.prisma.users.findUnique({
      where: { id: parseInt(id.toString()) },
      include: {
        roleAssignments: {
          where: { deleted: null },
          include: {
            role: {
              include: {
                rolePermissions: {
                  where: { deleted: null },
                  select: { id: true, slug: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      data: user,
      message: 'Successfully retrieved user',
      status: 200,
    };
  }

  async updateUser(id: number, data: UpdateUserDto, loggedInUser: any) {
    try {
      id = parseInt(id.toString());
      const user = await this.getUserById(id);
      if (
        data.role_id &&
        user.data.roleAssignments[0].role_id != data.role_id
      ) {
        if (loggedInUser.userRole[PERMISSION_SLUGS.CAN_UPDATE_USER_ROLE]) {
          await this.prisma.customAuthUserRoleRelationship.update({
            where: {
              id: user.data.roleAssignments[0].id,
            },
            data: {
              role_id: data.role_id,
              last_modified_by_id: loggedInUser.id,
              last_modified_at: new Date(),
            },
          });
        } else {
          throw new ForbiddenException(
            "You don't have permission to update this user role.",
          );
        }
      }
      ['username', 'email', 'is_superuser', 'role_id'].forEach((key) => {
        if (data[key]) delete data[key];
      });

      const updatedUser = await this.prisma.users.update({
        where: { id },
        data: {
          ...data,
          updated_at: new Date(),
        },
      });

      return {
        data: updatedUser,
        message: 'Successfully updated user',
        status: 200,
      };
    } catch (error) {
      this.logger.error(error);
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new InternalServerErrorException('Error updating user');
    }
  }

  async getCommonConfigs() {
    try {
      const roles = await this.prisma.customAuthRole.findMany({
        where: { deleted: null },
        select: { id: true, name: true, description: true },
      });
      const rolesPermissions = await this.prisma.customAuthRole.findFirst({
        where: { deleted: null, name: ROLES.ADMIN },
        include: {
          rolePermissions: {
            where: { deleted: null },
          },
        },
      });
      const countries = (
        await this.prisma.country.findMany({
          select: { id: true, code: true, name: true },
        })
      ).map((country) => ({
        ...country,
        id: Number(country.id),
      }));
      const cacheInvalidateKeys = CACHE_INVALIDATE_KEYS;
      const rolesValue = Object.values(ROLES);
      const speedTestProtocols = Object.values(SpeedTestProtocol);
      const permissions = rolesPermissions.rolePermissions;
      return {
        roles,
        rolesValue,
        permissions,
        countries,
        speedTestProtocols,
        cacheInvalidateKeys,
      };
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('Error retrieving common configs');
    }
  }

  async signinUser(input: { email: string; username: string; name?: string }) {
    try {
      const user = await this.prisma.users.findFirst({
        include: {
          roleAssignments: {
            where: { deleted: null },
            include: {
              role: {
                include: {
                  rolePermissions: {
                    where: { deleted: null },
                    select: { id: true, slug: true },
                  },
                },
              },
            },
          },
        },
        where: {
          email: input.email,
        },
      });
      const defaultRoles = await this.prisma.customAuthRole.findMany({
        where: { deleted: null, name: { in: [ROLES.READ_ONLY, ROLES.ADMIN] } },
        select: {
          id: true,
          name: true,
          rolePermissions: {
            select: { id: true, slug: true },
            where: { deleted: null },
          },
        },
      });
      const userRole = defaultRoles.filter(
        (role) => role.name === ROLES.READ_ONLY,
      )[0];
      if (!user) {
        const namesParts= input.name?.split?.(' ')||[];
        const [firstName, lastName] = || ['', ''];

        const newUser = await this.prisma.users.create({
          data: {
            email: input.email,
            username: input.email,
            first_name: firstName,
            last_name: lastName || null,
            created_at: new Date(),
            updated_at: new Date(),
            is_active: true,
            is_superuser: false,
          },
        });
        //insert new readonly relationship
        await this.prisma.customAuthUserRoleRelationship.create({
          data: {
            user_id: newUser.id,
            role_id: userRole.id,
            created: new Date(),
            last_modified_at: new Date(),
          },
        });
        const prittyRoles = this.formatRoles(
          defaultRoles.filter((el) => el.name == ROLES.ADMIN)[0],
          userRole,
        );
        return { ...newUser, role_name: userRole.name, userRole: prittyRoles };
      }
      if (!user.is_active) {
        throw new ForbiddenException(`We can't seem to find your account.`);
      }

      if (!user.roleAssignments.length) {
        user.roleAssignments.push({ role: userRole } as any);
      }
      const prittyRoles = this.formatRoles(
        defaultRoles.filter((el) => el.name == ROLES.ADMIN)[0],
        user.roleAssignments[0].role,
      );
      const role_name = user.roleAssignments[0].role.name;

      delete user.roleAssignments;
      return { ...user, role_name, userRole: prittyRoles };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  private formatRoles(adminRole: TypeRoles, userRole: TypeRoles) {
    const tempReformedRoles: { [key: string]: boolean } = {};
    for (const element of adminRole.rolePermissions) {
      tempReformedRoles[element.slug] = userRole.rolePermissions.some(
        (el) => el.slug === element.slug,
      );
    }
    return tempReformedRoles;
  }

  async clearCache(key?: string): Promise<{ message: string }> {
    try {
      if (key === 'all') {
        await redisClient.del(CMS_DATA_CACHE_KEY);
      } else if (key) {
        await redisClient.del(key);
      } else {
        await redisClient.del(CMS_DATA_CACHE_KEY);
      }
      this.logger.log(`Cache cleared manually for key: ${key || 'default'}`);
      return { message: 'Cache cleared successfully' };
    } catch (error) {
      this.logger.error(`Failed to clear cache: ${error.message}`);
      throw error;
    }
  }
}
