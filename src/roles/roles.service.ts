import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOrUpdateRoleDto } from './roles.dto';

@Injectable()
export class RolesService {
  private logger = new Logger(RolesService.name);

  constructor(private prisma: PrismaService) {}

  async create(dto: CreateOrUpdateRoleDto) {
    try {
      const now = new Date();

      const role = await this.prisma.customAuthRole.create({
        data: {
          name: dto.name,
          description: dto.description,
          category: 'custom',
          created: now,
          last_modified_at: now,
        },
      });

      await this.assignPermissions(role.id, dto.permission_slugs);

      return { role_id: role.id, ...role };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async update(roleId: number, dto: CreateOrUpdateRoleDto) {
    try {
      const exists = await this.prisma.customAuthRole.count({
        where: { id: roleId },
      });

      if (!exists) throw new NotFoundException('Role not found');

      const updatedRole = await this.prisma.customAuthRole.update({
        where: { id: roleId },
        data: {
          name: dto.name,
          description: dto.description,
          last_modified_at: new Date(),
        },
      });

      // Remove old permissions
      await this.prisma.customAuthRolePermission.deleteMany({
        where: { role_id: roleId },
      });

      // Add new permissions
      await this.assignPermissions(roleId, dto.permission_slugs);

      return { role_id: roleId, ...updatedRole };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  private async assignPermissions(roleId: number, slugs: string[]) {
    try {
      const now = new Date();
      const data = slugs.map((slug) => ({
        slug,
        role_id: roleId,
        created: now,
        last_modified_at: now,
      }));

      const info = await this.prisma.customAuthRolePermission.createMany({
        data,
      });
      return info;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async findAll(page: number, limit: number, search?: string) {
    const skip = (page - 1) * limit;

    const where = search
      ? { name: { contains: search, mode: 'insensitive', deleted: null } }
      : ({ deleted: null } as any);

    const [data, total] = await Promise.all([
      this.prisma.customAuthRole.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'asc' },
        include: {
          rolePermissions: {
            select: {
              slug: true,
            },
          },
        },
      }),
      this.prisma.customAuthRole.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(roleId: number) {
    const role = await this.prisma.customAuthRole.findUnique({
      where: { id: roleId },
      include: {
        rolePermissions: true,
      },
    });

    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  //soft delete.
  async remove(roleId: number) {
    try {
      const now = new Date();
      const role = await this.findOne(roleId);
      if (role.deleted) throw new NotFoundException('Role not found');
      const roleStatus = await this.prisma.customAuthRole.update({
        where: { id: roleId },
        data: { deleted: now },
      });
      const rolePermissionsStatus =
        await this.prisma.customAuthRolePermission.updateMany({
          where: { role_id: roleId },
          data: { deleted: now },
        });
      return { roleStatus, rolePermissionsStatus };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
