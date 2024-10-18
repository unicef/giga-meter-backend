import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  measurements as Measurement,
  measurements_failed as MeasurementFailed,
} from '@prisma/client';
import {
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
    return (await measurements).map(this.toDto);
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
  ): Promise<MeasurementDto[]> {
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
    return (await measurements).map(this.toDto);
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
    return (await measurements).map(this.toDto);
  }

  async createMeasurement(measurementDto: MeasurementDto): Promise<string> {
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
    dto: MeasurementDto,
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
            lt: hasTime ? filter_value : parsedDate,
          };
          break;
        case 'lte':
          filter[filter_by] = {
            lte: hasTime ? filter_value : endOfDay,
          };
          break;
        case 'gt':
          filter[filter_by] = {
            gt: hasTime ? filter_value : endOfDay,
          };
          break;
        case 'gte':
          filter[filter_by] = {
            gte: hasTime ? filter_value : parsedDate,
          };
          break;
        case 'eq':
          filter[filter_by] = hasTime
            ? {
                equals: filter_value,
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

  private toDto(measurement: Measurement): MeasurementDto {
    const clientInfo = plainToInstance(ClientInfoDto, measurement.client_info);
    return {
      id: measurement.id.toString(),
      Timestamp: measurement.timestamp,
      UUID: measurement.uuid,
      BrowserID: measurement.browser_id,
      school_id: measurement.school_id,
      DeviceType: measurement.device_type,
      Notes: measurement.notes,
      ClientInfo: clientInfo,
      ServerInfo: plainToInstance(ServerInfoDto, measurement.server_info),
      annotation: measurement.annotation,
      Download: measurement.download,
      Upload: measurement.upload,
      Latency: parseInt(measurement.latency.toString()),
      Results: plainToInstance(ResultsDto, measurement.results),
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
      ip_address: measurement.ip_address,
      app_version: measurement.app_version,
      source: measurement.source,
      created_at: measurement.created_at,
    };
  }

  private toV2Dto(measurement: Measurement): MeasurementV2Dto {
    const clientInfo =
      measurement.source.toLowerCase() === 'mlab'
        ? plainToInstance(ClientInfoDto, measurement.client_info ?? '')
        : {};
    return {
      Timestamp: measurement.timestamp,
      BrowserID: measurement.browser_id,
      school_id: measurement.school_id,
      Download: measurement.download,
      Upload: measurement.upload,
      Latency: parseInt(measurement.latency.toString()),
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
      Results: plainToInstance(ResultsDto, measurement.results),
      giga_id_school: measurement.giga_id_school,
      country_code: measurement.country_code,
      ip_address: measurement.ip_address,
      app_version: measurement.app_version,
      source: measurement.source,
      created_at: measurement.created_at,
      reason: measurement.reason,
    };
  }

  private toModel(measurement: MeasurementDto): any {
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
    };
  }

  private toFailedModel(measurement: MeasurementDto, reason: string): any {
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
