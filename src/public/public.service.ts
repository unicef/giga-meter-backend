import { Injectable } from '@nestjs/common';
import { dailycheckapp_school as School } from '@prisma/client';
import {
  PublicClientInfoDto,
  PublicCountryDto,
  PublicMeasurementDto,
  PublicResultsDto,
  PublicSchoolDto,
  PublicServerInfoDto,
} from './public.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { dailycheckapp_country as Country } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { measurements as Measurement } from '@prisma/client';

@Injectable()
export class PublicService {
  constructor(private prisma: PrismaService) {}

  async schools(
    skip?: number,
    take?: number,
    giga_id_school?: string,
    country_iso3_code?: string,
    write_access?: boolean,
    countries?: string[],
  ): Promise<PublicSchoolDto[]> {
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
    return (await schools).map(this.toSchoolDto);
  }

  async countries(params: {
    skip?: number;
    take?: number;
    write_access?: boolean;
    countries?: string[];
  }): Promise<PublicCountryDto[]> {
    const { skip, take, write_access, countries } = params;
    const filter: Record<string, any> = {
      code: {
        in: countries,
      },
    };
    if (write_access) {
      delete filter.country_code;
    }

    const records = this.prisma.dailycheckapp_country.findMany({
      where: filter,
      skip,
      take,
      orderBy: { name: 'asc' },
    });
    return (await records).map(this.toCountryDto);
  }

  async measurements(
    skip?: number,
    take?: number,
    order_by?: string,
    giga_id_school?: string,
    country_iso3_code?: string,
    filter_by?: string,
    filter_condition?: string,
    filter_value?: Date,
    write_access?: boolean,
    countries?: string[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    isSuperUser?: boolean,
  ): Promise<PublicMeasurementDto[]> {
    const filter = this.applyFilter(
      giga_id_school,
      filter_by,
      filter_condition,
      filter_value,
      write_access,
      countries,
    );

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

    const measurements = this.prisma.measurements.findMany({
      where: filter,
      skip,
      take,
      orderBy: {
        [order_by?.replace('-', '')]: order_by?.includes('-') ? 'desc' : 'asc',
      },
    });
    return (await measurements).map((measurement) => this.toDto(measurement));
  }
  private applyFilter(
    giga_id_school?: string,
    filter_by?: string,
    filter_condition?: string,
    filter_value?: Date,
    write_access?: boolean,
    countries?: string[],
  ): Record<string, any> {
    const filter: Record<string, any> = {
      giga_id_school,
      country_code: {
        in: countries,
      },
    };

    if (!giga_id_school) {
      delete filter.giga_id_school;
    }
    if (write_access) {
      delete filter.country_code;
    }
    if (filter_by && filter_condition && filter_value != null) {
      const parsedDate = new Date(filter_value);
      const formattedDate = parsedDate.toISOString();
      const hasTime =
        parsedDate.getUTCHours() > 0 ||
        parsedDate.getUTCMinutes() > 0 ||
        parsedDate.getUTCSeconds() > 0 ||
        parsedDate.getUTCMilliseconds() > 0;
      const endOfDay = new Date(filter_value);
      endOfDay.setUTCHours(23, 59, 59, 999);

      switch (filter_condition) {
        case 'lt':
          filter[filter_by] = {
            lt: hasTime ? formattedDate : parsedDate.toISOString(),
          };
          break;
        case 'lte':
          filter[filter_by] = {
            lte: hasTime ? formattedDate : endOfDay.toISOString(),
          };
          break;
        case 'gt':
          filter[filter_by] = {
            gt: hasTime ? formattedDate : endOfDay.toISOString(),
          };
          break;
        case 'gte':
          filter[filter_by] = {
            gte: hasTime ? formattedDate : parsedDate.toISOString(),
          };
          break;
        case 'eq':
          filter[filter_by] = hasTime
            ? {
                equals: formattedDate,
              }
            : {
                gte: parsedDate,
                lte: endOfDay,
              };
          break;
        default:
          break;
      }
    }
    return filter;
  }

  private removeConnectionInfo(results: any): any {
    if (!results) return results;

    const cleaned = { ...results };

    // Remove ConnectionInfo and NDTResult.S2C.ClientIP
    if (
      cleaned['NDTResult.C2S']?.LastServerMeasurement?.ConnectionInfo !==
      undefined
    ) {
      delete cleaned['NDTResult.C2S'].LastServerMeasurement.ConnectionInfo;
    }
    if (
      cleaned['NDTResult.S2C']?.LastServerMeasurement?.ConnectionInfo !==
      undefined
    ) {
      delete cleaned['NDTResult.S2C'].LastServerMeasurement.ConnectionInfo;
    }
    if (cleaned['NDTResult.S2C.ClientIP'] !== undefined) {
      delete cleaned['NDTResult.S2C.ClientIP'];
    }

    return cleaned;
  }

  private toDto(measurement: Measurement): PublicMeasurementDto {
    const clientInfo = plainToInstance(
      PublicClientInfoDto,
      measurement.client_info,
    );
    const filteredClientInfo = clientInfo;
    // isSuperUser
    //   ? clientInfo
    //   : { ...clientInfo, IP: undefined };

    // Clean up Results object to remove ConnectionInfo
    const cleanResults = measurement.results
      ? this.removeConnectionInfo(measurement.results)
      : undefined;

    const filterMeasurementData = {
      id: measurement.id.toString(),
      Timestamp: measurement.timestamp,
      BrowserID: measurement.browser_id,
      DeviceType: measurement.device_type,
      Notes: measurement.notes,
      ClientInfo: filteredClientInfo,
      ServerInfo: plainToInstance(PublicServerInfoDto, measurement.server_info),
      annotation: measurement.annotation,
      Download: measurement.download,
      Upload: measurement.upload,
      Latency: parseInt(measurement.latency.toString()),
      Results: cleanResults
        ? plainToInstance(PublicResultsDto, cleanResults)
        : undefined,
      DataDownloaded: measurement.data_downloaded
        ? parseInt(measurement.data_downloaded.toString())
        : undefined,
      DataUploaded: measurement.data_uploaded
        ? parseInt(measurement.data_uploaded.toString())
        : undefined,
      DataUsage: measurement.data_usage
        ? parseInt(measurement.data_usage.toString())
        : undefined,
      giga_id_school: measurement.giga_id_school,
      country_code:
        measurement.source.toLowerCase() === 'mlab'
          ? clientInfo?.Country
          : measurement.country_code,
      app_version: measurement.app_version,
      source: measurement.source,
      created_at: measurement.created_at,
      geolocation: undefined,
      detected_location_distance: measurement.detected_location_distance,
      detected_location_accuracy: measurement.detected_location_accuracy,
      detected_location_is_flagged: measurement.detected_location_is_flagged,
      windows_username: measurement.windows_username,
      installed_path: measurement.installed_path,
      wifi_connections: measurement.wifi_connections
        ? JSON.parse(JSON.stringify(measurement.wifi_connections))
        : undefined,
    };
    // if (isSuperUser) {
    filterMeasurementData['UUID'] = measurement.uuid;
    filterMeasurementData['ip_address'] = measurement.ip_address;
    filterMeasurementData['school_id'] = measurement.school_id;
    filterMeasurementData['device_hardware_id'] =
      measurement.device_hardware_id;
    // }
    return filterMeasurementData;
  }

  private toCountryDto(country: Country): PublicCountryDto {
    return {
      id: country.id.toString(),
      code: country.code,
      code_iso3: country.code_iso3,
      name: country.name,
      country_id: country.country_id,
      created_at: country.created_at,
    };
  }

  private toSchoolDto(school: School): PublicSchoolDto {
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
}
