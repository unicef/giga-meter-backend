import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ROLES } from 'src/roles/roles.constants';
import { GetUsersQueryDto, UpdateUserDto } from './users.dto';
import { Prisma } from '@prisma/client';

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
    const { page, page_size, search } = query;
    if (!page || !page_size)
      throw new BadRequestException('page and page_size are required');
    const skip = (page - 1) * page_size;

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
        take: parseInt(page_size.toString()),
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
        page_size,
        total,
        totalPages: Math.ceil(total / page_size),
      },
    };
  }

  async getUserById(id: number) {
    const user = await this.prisma.users.findFirst({
      where: { id: parseInt(id.toString()) },
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

  async updateUser(id: number, data: UpdateUserDto) {
    await this.getUserById(id);
    const updatedUser = await this.prisma.users.update({
      where: { id: parseInt(id.toString()) },
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
  }

  async signinUser(input: { email: string; username: string }) {
    try {
      const user = await this.prisma.users.findFirst({
        include: {
          roleAssignments: {
            where: { deleted: null },
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
      if (!user) {
        const newUser = await this.prisma.users.create({
          data: {
            email: input.email,
            username: input.email,
            created_at: new Date(),
            updated_at: new Date(),
            is_active: true,
            is_superuser: false,
          },
        });
        const userRole = defaultRoles.filter(
          (role) => role.name === ROLES.READ_ONLY,
        )[0];
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
        return { ...newUser, userRole: prittyRoles };
      }
      if (!user.is_active) {
        throw new ForbiddenException(`We can't seem to find your account.`);
      }
      const userRole = await this.prisma.customAuthRole.findFirst({
        where: { id: user?.roleAssignments[0]?.role_id },
        select: {
          id: true,
          name: true,
          rolePermissions: {
            select: { id: true, slug: true },
            where: { deleted: null },
          },
        },
      });
      const prittyRoles = this.formatRoles(
        defaultRoles.filter((el) => el.name == ROLES.ADMIN)[0],
        userRole,
      );

      delete user.roleAssignments;
      return { ...user, userRole: prittyRoles };
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
}
