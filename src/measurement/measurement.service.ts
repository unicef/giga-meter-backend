import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  measurements as Measurement,
  measurements_failed as MeasurementFailed,
} from '@prisma/client';
import {
  AddMeasurementDto,
  ClientInfoDto,
  MeasurementDto,
  MeasurementFailedDto,
  MeasurementV2Dto,
  ResultsDto,
  ServerInfoDto,
} from './measurement.dto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class MeasurementService {
  SCHOOL_DOESNT_EXIST_ERR = 'PCDC school does not exist';
  WRONG_COUNTRY_CODE_ERR = 'Wrong country code';
  constructor(private prisma: PrismaService) {}

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
    isSuperUser?: boolean,
  ): Promise<MeasurementDto[]> {
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
    return (await measurements).map((measurement) =>
      this.toDto(measurement, isSuperUser),
    );
  }

  async measurementsV2(
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
  ): Promise<MeasurementV2Dto[]> {
    const filter = this.applyFilter(
      giga_id_school,
      filter_by,
      filter_condition,
      filter_value,
      write_access,
      countries,
    );

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

    const measurements = this.prisma.measurements.findMany({
      where: filter,
      skip,
      take,
      orderBy: {
        [order_by.replace('-', '')]: order_by.includes('-') ? 'desc' : 'asc',
      },
    });
    return (await measurements).map(this.toV2Dto);
  }

  async measurementsFailed(
    skip?: number,
    take?: number,
    write_access?: boolean,
    countries?: string[],
  ): Promise<MeasurementFailedDto[]> {
    const query = {
      skip,
      take,
      where: {
        country_code: { in: countries },
      },
    };

    if (write_access) {
      delete query.where.country_code;
    }

    const measurements = this.prisma.measurements_failed.findMany(query);
    return (await measurements).map(this.toFailedDto);
  }

  async measurementsById(
    id: number,
    write_access?: boolean,
    countries?: string[],
  ): Promise<MeasurementDto[]> {
    const query = {
      where: {
        id,
        country_code: { in: countries },
      },
    };
    if (write_access) {
      delete query.where.country_code;
    }

    const measurements = this.prisma.measurements.findMany(query);
    return (await measurements).map((measurement) =>
      this.toDto(measurement, true),
    );
  }

  async measurementsBySchoolId(
    school_id: string,
    write_access?: boolean,
    countries?: string[],
  ): Promise<MeasurementDto[]> {
    const query = {
      where: {
        school_id,
        country_code: { in: countries },
      },
    };
    if (write_access) {
      delete query.where.country_code;
    }

    const measurements = this.prisma.measurements.findMany(query);
    return (await measurements).map((measurement) =>
      this.toDto(measurement, true),
    );
  }

  async createMeasurement(measurementDto: AddMeasurementDto): Promise<string> {
    const processedResponse = await this.processMeasurement(measurementDto);

    switch (processedResponse) {
      case this.SCHOOL_DOESNT_EXIST_ERR:
      case this.WRONG_COUNTRY_CODE_ERR: {
        const failedModel = this.toFailedModel(
          measurementDto,
          processedResponse,
        );
        await this.prisma.measurements_failed.create({ data: failedModel });
        return processedResponse;
      }

      default: {
        const model = this.toModel(measurementDto);
        await this.prisma.measurements.create({
          data: model,
        });
        return '';
      }
    }
  }

  private async processMeasurement(
    dto: AddMeasurementDto,
  ): Promise<string | null> {
    const existingRecord = await this.prisma.dailycheckapp_school.findFirst({
      where: { giga_id_school: dto.giga_id_school },
    });

    if (existingRecord == null) {
      return this.SCHOOL_DOESNT_EXIST_ERR;
    }

    const gigaSchoolMapping =
      await this.prisma.giga_id_school_mapping_fix.findFirst({
        where: { giga_id_school_wrong: dto.giga_id_school },
      });

    if (gigaSchoolMapping != null) {
      return gigaSchoolMapping.correct_country.toLowerCase() ===
        dto.country_code.toLowerCase()
        ? gigaSchoolMapping.giga_id_school_correct
        : this.WRONG_COUNTRY_CODE_ERR;
    }
    return null;
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

  private toDto(
    measurement: Measurement,
    isSuperUser?: boolean,
  ): MeasurementDto {
    const clientInfo = plainToInstance(ClientInfoDto, measurement.client_info);
    const filteredClientInfo = isSuperUser
      ? clientInfo
      : { ...clientInfo, IP: undefined };

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
      ServerInfo: plainToInstance(ServerInfoDto, measurement.server_info),
      annotation: measurement.annotation,
      Download: measurement.download,
      Upload: measurement.upload,
      Latency: parseInt(measurement.latency.toString()),
      Results: cleanResults
        ? plainToInstance(ResultsDto, cleanResults)
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
    };
    if (isSuperUser) {
      filterMeasurementData['UUID'] = measurement.uuid;
      filterMeasurementData['ip_address'] = measurement.ip_address;
      filterMeasurementData['school_id'] = measurement.school_id;
    }
    return filterMeasurementData;
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

  private toV2Dto(measurement: Measurement): MeasurementV2Dto {
    const clientInfo =
      measurement.source.toLowerCase() === 'mlab'
        ? plainToInstance(ClientInfoDto, measurement.client_info ?? '')
        : {};
    return {
      timestamp: measurement.timestamp,
      browserId: measurement.browser_id,
      school_id: measurement.school_id,
      download: measurement.download,
      upload: measurement.upload,
      latency: parseInt(measurement.latency.toString()),
      giga_id_school: measurement.giga_id_school,
      country_code:
        measurement.source.toLowerCase() === 'mlab'
          ? clientInfo?.Country
          : measurement.country_code,
      ip_address: measurement.ip_address,
      app_version: measurement.app_version,
      source: measurement.source,
      created_at: measurement.created_at,
    };
  }

  private toFailedDto(measurement: MeasurementFailed): MeasurementFailedDto {
    return {
      id: measurement.id.toString(),
      Timestamp: measurement.timestamp,
      UUID: measurement.uuid,
      BrowserID: measurement.browser_id,
      school_id: measurement.school_id,
      DeviceType: measurement.device_type,
      Notes: measurement.notes,
      ClientInfo: plainToInstance(ClientInfoDto, measurement.client_info),
      ServerInfo: plainToInstance(ServerInfoDto, measurement.server_info),
      annotation: measurement.annotation,
      Download: measurement.download,
      Upload: measurement.upload,
      Latency: parseInt(measurement.latency.toString()),
      DataDownloaded: measurement.data_downloaded
        ? parseInt(measurement.data_downloaded.toString())
        : undefined,
      DataUploaded: measurement.data_uploaded
        ? parseInt(measurement.data_uploaded.toString())
        : undefined,
      DataUsage: measurement.data_usage
        ? parseInt(measurement.data_usage.toString())
        : undefined,
      Results: measurement.results
        ? this.removeConnectionInfo(measurement.results)
          ? plainToInstance(
              ResultsDto,
              this.removeConnectionInfo(measurement.results),
            )
          : undefined
        : undefined,
      giga_id_school: measurement.giga_id_school,
      country_code: measurement.country_code,
      ip_address: measurement.ip_address,
      app_version: measurement.app_version,
      source: measurement.source,
      created_at: measurement.created_at,
      reason: measurement.reason,
    };
  }

  private toModel(measurement: AddMeasurementDto): any {
    // Extraer los resultados NDT7 si existen
    const results = measurement.Results || {};
    const c2sServer = results['NDTResult.C2S']?.LastServerMeasurement;
    const s2cServer = results['NDTResult.S2C']?.LastServerMeasurement;
    const c2sTCP = c2sServer?.TCPInfo;
    const s2cTCP = s2cServer?.TCPInfo;
    const c2sConn = c2sServer?.ConnectionInfo;

    const client = measurement.ClientInfo || {};
    //Get params from ClientInfo object from upper or lower case
    // This is to avoid the error: TypeError: Cannot read properties of undefined (reading 'lower')
    const getField = <T = any>(lower: string, upper: string): T | undefined =>
      (client as any)[lower] ?? (client as any)[upper];

    const latitude = getField<number>('latitude', 'Latitude');
    const longitude = getField<number>('longitude', 'Longitude');
    const geoLoc =
      getField<string>('loc', 'Loc') ??
      (typeof latitude === 'number' && typeof longitude === 'number'
        ? `${latitude},${longitude}`
        : undefined);

    return {
      timestamp: measurement.Timestamp,
      uuid: measurement.UUID,
      browser_id: measurement.BrowserID,
      school_id: measurement.school_id,
      device_type: measurement.DeviceType,
      notes: measurement.Notes,
      client_info: measurement.ClientInfo,
      server_info: measurement.ServerInfo,
      annotation: measurement.annotation,
      download: measurement.Download,
      upload: measurement.Upload,
      data_downloaded: measurement?.DataDownloaded,
      data_uploaded: measurement?.DataUploaded,
      data_usage: measurement?.DataUsage,
      latency: measurement.Latency,
      results: measurement.Results,
      giga_id_school: measurement.giga_id_school?.toLowerCase().trim(),
      country_code: measurement.country_code,
      ip_address: measurement.ip_address,
      app_version: measurement.app_version,
      source: 'DailyCheckApp',

      elapsed_time_download: c2sTCP?.ElapsedTime, // ms
      elapsed_time_upload: s2cTCP?.ElapsedTime, // ms
      download_rtt_variance: c2sTCP?.RTTVar, // ms²

      connection_is_mobile:
        typeof getField<string>('network_type', 'NetworkType') === 'string' &&
        getField<string>('network_type', 'NetworkType')!
          .toLowerCase()
          .includes('mobile'),
      connection_is_satellite:
        typeof getField<string>('network_type', 'NetworkType') === 'string' &&
        getField<string>('network_type', 'NetworkType')!
          .toLowerCase()
          .includes('satellite'),

      client_ip_address: client.IP ?? c2sConn?.Client?.split(':')[0],
      client_city: getField<string>('city', 'City'),
      client_region: getField<string>('region', 'Region'),
      client_country: getField<string>('country', 'Country'),
      client_geolocation: geoLoc,
      client_timezone: getField<string>('timezone', 'Timezone'),

      asn_number: (client.ASN as any)?.asn ?? getField<string>('ASN', 'Asn'),
      asn_name: (client.ASN as any)?.name ?? getField<string>('ISP', 'Isp'),
      asn_network_type: (client.ASN as any)?.type,
      asn_network_route: (client.ASN as any)?.route,
    };
  }

  private toFailedModel(measurement: AddMeasurementDto, reason: string): any {
    return {
      timestamp: measurement.Timestamp,
      uuid: measurement.UUID,
      browser_id: measurement.BrowserID,
      school_id: measurement.school_id,
      device_type: measurement.DeviceType,
      notes: measurement.Notes,
      client_info: measurement.ClientInfo,
      server_info: measurement.ServerInfo,
      annotation: measurement.annotation,
      download: measurement.Download,
      upload: measurement.Upload,
      latency: measurement.Latency,
      results: measurement.Results,
      giga_id_school: measurement.giga_id_school?.toLowerCase().trim(),
      country_code: measurement.country_code,
      ip_address: measurement.ip_address,
      app_version: measurement.app_version,
      source: 'DailyCheckApp',
      reason,
    };
  }
}
