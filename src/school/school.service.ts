import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { dailycheckapp_school as School } from '@prisma/client';
import { SchoolDto } from './school.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SchoolService {
  constructor(private prisma: PrismaService) {}

  async schools(
    skip?: number,
    take?: number,
    giga_id_school?: string,
    country_iso3_code?: string,
    write_access?: boolean,
    countries?: string[],
  ): Promise<SchoolDto[]> {
    const filter = {
      giga_id_school,
      country_code: { in: countries },
    };

    if (!giga_id_school) {
      delete filter.giga_id_school;
    }
    if (write_access) {
      delete filter.country_code;
    }
    if (country_iso3_code) {
      const dbCountry = await this.prisma.dailycheckapp_country.findFirst({
        where: { code_iso3: country_iso3_code },
      });
      if (
        !dbCountry?.code ||
        (!write_access && !countries?.includes(dbCountry.code))
      ) {
        return [];
      }
      filter.country_code = { in: [dbCountry.code] };
    }

    const schools = this.prisma.dailycheckapp_school.findMany({
      skip,
      take,
      where: filter,
      orderBy: { created: 'desc' },
    });
    return (await schools).map(this.toDto);
  }

  async schoolsByGigaId(
    giga_id_school: string,
    write_access?: boolean,
    countries?: string[],
  ): Promise<SchoolDto[]> {
    const query = {
      where: {
        giga_id_school,
        country_code: { in: countries },
      },
    };
    if (write_access) {
      delete query.where.country_code;
    }

    const schools = this.prisma.dailycheckapp_school.findMany(query);
    return (await schools).map(this.toDto);
  }

  async schoolsById(
    id: number,
    write_access?: boolean,
    countries?: string[],
  ): Promise<SchoolDto[]> {
    const query = {
      where: {
        id,
        country_code: { in: countries },
      },
    };
    if (write_access) {
      delete query.where.country_code;
    }

    const schools = this.prisma.dailycheckapp_school.findMany(query);
    return (await schools).map(this.toDto);
  }

  async schoolsByCountryId(country_code: string): Promise<SchoolDto[]> {
    const schools = this.prisma.dailycheckapp_school.findMany({
      where: { country_code },
    });
    return (await schools).map(this.toDto);
  }

  async checkNotify(user_id: string): Promise<boolean> {
    const school = await this.prisma.dailycheckapp_school.findFirstOrThrow({
      where: { user_id },
    });

    if (school?.notify) {
      await this.prisma.dailycheckapp_school.updateMany({
        where: { user_id },
        data: { notify: false },
      });
      return true;
    }
    return false;
  }

  async createSchool(schoolDto: SchoolDto): Promise<string> {
    const model = this.toModel(schoolDto);
    const school = await this.prisma.dailycheckapp_school.create({
      data: model,
    });
    return school.user_id;
  }

  async checkExistingInstallation(device_hardware_id: string): Promise<{
    exists: boolean;
    user_id?: string;
    school_id?: string;
    giga_id_school?: string;
    mac_address?: string;
    os?: string;
    ip_address?: string;
    app_version?: string;
    country_code?: string;
    source?: string;
    schoolInfo?: any;
    is_active?: boolean;
  }> {
    // First check in dailycheckapp_school table
    // Include records where is_active is NOT false (true, null, or undefined)
    const school = await this.prisma.dailycheckapp_school.findFirst({
      where: {
        device_hardware_id,
        OR: [{ is_active: null }, { is_active: true }],
      },
    });
    if (school) {
      // Fetch school information from the school table
      let schoolInfo = null;
      let externalSchoolId = null;
      if (school.giga_id_school) {
        const schoolData = await this.prisma.school.findFirst({
          where: {
            giga_id_school: school.giga_id_school,
            deleted: null,
          },
        });

        // Format school data to DTO structure
        if (schoolData) {
          externalSchoolId = schoolData.external_id;
          schoolInfo = {
            id: parseInt(schoolData.id.toString()),
            school_id: schoolData.external_id,
            code: '',
            name: schoolData.name,
            country_id: schoolData.country_id,
            country: schoolData.country_code,
            location_id: schoolData.location_id,
            address: schoolData.address,
            email: schoolData.email,
            postal_code: schoolData.postal_code,
            education_level: schoolData.education_level,
            environment: schoolData.environment,
            admin_1_name: schoolData.admin_1_name,
            admin_2_name: schoolData.admin_2_name,
            admin_3_name: schoolData.admin_3_name,
            admin_4_name: schoolData.admin_4_name,
            giga_id_school: schoolData.giga_id_school,
          };
        }
      }

      return {
        exists: true,
        user_id: school.user_id,
        school_id: externalSchoolId,
        giga_id_school: school.giga_id_school,
        mac_address: school.mac_address,
        os: school.os,
        ip_address: school.ip_address,
        app_version: school.app_version,
        country_code: school.country_code,
        source: 'dailycheckapp_school',
        schoolInfo: schoolInfo,
        is_active: school.is_active,
      };
    }

    // If not found, check in measurements table
    const measurement = await this.prisma.measurements.findFirst({
      where: { device_hardware_id },
      orderBy: { timestamp: 'desc' }, // Get the most recent measurement
    });

    if (measurement && measurement.browser_id) {
      // Try to find a school with matching user_id (browser_id maps to user_id)
      // Include records where is_active is NOT false (true, null, or undefined)
      const schoolByBrowserId =
        await this.prisma.dailycheckapp_school.findFirst({
          where: {
            user_id: measurement.browser_id,
            OR: [{ is_active: null }, { is_active: true }],
          },
        });

      if (schoolByBrowserId) {
        // Fetch school information from the school table
        let schoolInfo = null;
        let externalSchoolId = null;
        if (schoolByBrowserId.giga_id_school) {
          const schoolData = await this.prisma.school.findFirst({
            where: {
              giga_id_school: schoolByBrowserId.giga_id_school,
              deleted: null,
            },
          });

          // Format school data to DTO structure
          if (schoolData) {
            externalSchoolId = schoolData.external_id;
            schoolInfo = {
              id: parseInt(schoolData.id.toString()),
              school_id: schoolData.external_id,
              code: '',
              name: schoolData.name,
              country_id: schoolData.country_id,
              country: schoolData.country_code,
              location_id: schoolData.location_id,
              address: schoolData.address,
              email: schoolData.email,
              postal_code: schoolData.postal_code,
              education_level: schoolData.education_level,
              environment: schoolData.environment,
              admin_1_name: schoolData.admin_1_name,
              admin_2_name: schoolData.admin_2_name,
              admin_3_name: schoolData.admin_3_name,
              admin_4_name: schoolData.admin_4_name,
              giga_id_school: schoolData.giga_id_school,
            };
          }
        }

        return {
          exists: true,
          user_id: schoolByBrowserId.user_id,
          school_id: externalSchoolId,
          giga_id_school: schoolByBrowserId.giga_id_school,
          mac_address: schoolByBrowserId.mac_address,
          os: schoolByBrowserId.os,
          ip_address: schoolByBrowserId.ip_address,
          app_version: schoolByBrowserId.app_version,
          country_code: schoolByBrowserId.country_code,
          source: 'measurements',
          schoolInfo: schoolInfo,
          is_active: schoolByBrowserId.is_active,
        };
      }
    }

    // No installation found
    return {
      exists: false,
    };
  }

  async checkDeviceStatus(
    device_hardware_id: string,
    giga_id_school: string,
  ): Promise<{ is_active: boolean; message: string; exists: boolean }> {
    // Find the latest installation based on created timestamp
    const school = await this.prisma.dailycheckapp_school.findFirst({
      where: {
        device_hardware_id,
        giga_id_school: giga_id_school?.toLowerCase().trim(),
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    if (!school) {
      // For backward compatibility, if no record exists, treat as active (not deactivated)
      return {
        is_active: true,
        message: 'Device not found',
        exists: false,
      };
    }

    // Only consider device deactivated if is_active is explicitly false
    // Treat true, null, or undefined as active (for backward compatibility)
    if (school.is_active === false) {
      return {
        is_active: false,
        message: 'Device has been deactivated',
        exists: true,
      };
    }

    // Device is active (is_active is true, null, or undefined)
    return {
      is_active: true,
      message: 'Device is active',
      exists: true,
    };
  }

  async deactivateDevice(
    device_hardware_id: string,
    giga_id_school: string,
  ): Promise<{ deactivated: boolean; message?: string }> {
    // Find the record where hardware_id + giga_id_school + is_active is true (or null/undefined)
    const result = await this.prisma.dailycheckapp_school.updateMany({
      where: {
        device_hardware_id,
        giga_id_school: giga_id_school?.toLowerCase().trim(),
        OR: [{ is_active: null }, { is_active: true }],
      },
      data: {
        is_active: false,
      },
    });

    if (result.count > 0) {
      return {
        deactivated: true,
        message: `Successfully deactivated ${result.count} device(s)`,
      };
    }

    return {
      deactivated: false,
      message:
        'No active device found with the provided hardware_id and giga_id_school',
    };
  }

  private toDto(school: School): SchoolDto {
    return {
      id: school.id.toString(),
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
      device_hardware_id: school.device_hardware_id,
      is_active: school.is_active,
      windows_username: school.windows_username,
      installed_path: school.installed_path,
      wifi_connections: school.wifi_connections
        ? JSON.parse(JSON.stringify(school.wifi_connections))
        : undefined,
    };
  }

  private toModel(school: SchoolDto): any {
    return {
      user_id: school?.user_id || uuidv4(),
      giga_id_school: school.giga_id_school?.toLowerCase().trim(),
      mac_address: school.mac_address,
      os: school.os,
      app_version: school.app_version,
      created: school.created,
      ip_address: school.ip_address,
      country_code: school.country_code,
      device_hardware_id: school.device_hardware_id,
      is_active: school.is_active,
      windows_username: school.windows_username,
      installed_path: school.installed_path,
      wifi_connections: school.wifi_connections,
    };
  }
}
