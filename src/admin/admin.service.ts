import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { dailycheckapp_school as School } from '@prisma/client';
import { AdminSchoolDto } from './admin.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async schools(): Promise<AdminSchoolDto[]> {
    const schools = this.prisma.dailycheckapp_school.findMany();
    return (await schools).map(this.toDto);
  }

  async blockSchools(schoolIds: number[]): Promise<boolean> {
    await this.prisma.dailycheckapp_school.updateMany({
      where: { id: { in: schoolIds } },
      data: { is_blocked: true },
    });
    return true;
  }

  async unblockSchools(schoolIds: number[]): Promise<boolean> {
    await this.prisma.dailycheckapp_school.updateMany({
      where: { id: { in: schoolIds } },
      data: { is_blocked: false },
    });
    return true;
  }

  async notifySchools(schoolIds: number[]): Promise<boolean> {
    await this.prisma.dailycheckapp_school.updateMany({
      where: { id: { in: schoolIds } },
      data: { notify: true },
    });
    return true;
  }

  async assignRoleToUser(id: number, roleId: number) {
    try {
      // Check if the user already has a role assignment
      const existingAssignment =
        await this.prisma.customAuthUserRoleRelationship.findFirst({
          where: { user_id: parseInt(id.toString()), deleted: null },
        });

      // Update existing role assignment
      const user = await this.prisma.customAuthUserRoleRelationship.update({
        where: { id: existingAssignment.id },
        data: { role_id: roleId, last_modified_at: new Date() },
      });

      return {
        data: { ...user, role_id: roleId },
        message: 'Role assigned successfully',
        status: 200,
      };
    } catch (error) {
      throw new InternalServerErrorException('Error assigning role to user');
    }
  }

  private toDto(school: School): AdminSchoolDto {
    return {
      id: parseInt(school.id.toString()),
      user_id: school.user_id,
      giga_id_school: school.giga_id_school,
      mac_address: school.mac_address,
      os: school.os,
      app_version: school.app_version,
      created: school.created,
      network_information: school.network_information,
      ip_address: school.ip_address,
      country_code: school.country_code,
      is_blocked: school.is_blocked,
      created_at: school.created_at,
    };
  }
}
