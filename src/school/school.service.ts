import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { dailycheckapp_school as School } from '@prisma/client';
import { SchoolDto } from './school.dto';
import { v4 as uuidv4 } from 'uuid';
import { GeolocationUtility } from '../geolocation/geolocation.utility';

@Injectable()
export class SchoolService {
  constructor(private prisma: PrismaService, private readonly geolocationUtility: GeolocationUtility) {}

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
      // Process geolocation data if available
      if (schoolDto.geolocation && 
        schoolDto.geolocation.location &&
        schoolDto.geolocation.accuracy) {
      try {
        // Get the school coordinates based on giga_id_school
        if (schoolDto.giga_id_school) {
          // Use the common utility to calculate distance and set flags
          const geoResult = await this.geolocationUtility.calculateDistanceAndSetFlag(
            schoolDto.giga_id_school,
            schoolDto.geolocation.location,
            schoolDto.geolocation.accuracy
          );
          
          // Store the results in the measurement DTO
          schoolDto.detected_location_accuracy = geoResult.accuracy;
          schoolDto.detected_location_distance = geoResult.distance;
          schoolDto.detected_location_is_flagged = geoResult.isFlagged;
        }
      } catch (error) {
        console.error('Error processing geolocation data:', error);
      }
    }
    const model = this.toModel(schoolDto);
    const school = await this.prisma.dailycheckapp_school.create({
      data: model,
    });
    
    // If geolocation data is provided, process it
    try {
      // Use raw SQL to set the PostGIS geography point
      await this.geolocationUtility.createPostGISPoint(
        'dailycheckapp_school',
        'id',
        school.id,
        schoolDto.geolocation.location.lat, 
        schoolDto.geolocation.location.lng,
      );
    } catch (error) {
      console.error('Error updating geolocation point:', error);
    }
    
    return school.user_id;
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
      detected_location_accuracy: school.detected_location_accuracy,
      detected_location_distance: school.detected_location_distance,
      detected_location_is_flagged: school.detected_location_is_flagged
    };
  }
}
