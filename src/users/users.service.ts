import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ROLES } from 'src/roles/roles.constants';

type TypeRoles = {
  id: number;
  name: string;
  rolePermissions: { id: number; slug: string }[];
};

@Injectable()
export class UsersService {
  private logger = new Logger(UsersService.name);
  constructor(private prisma: PrismaService) {}

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
