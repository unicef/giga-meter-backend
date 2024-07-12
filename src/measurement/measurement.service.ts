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
    const query = {
      skip,
      take,
      where: {
        giga_id_school,
        country_code: { in: countries },
      },
    };

    if (!giga_id_school) {
      delete query.where.giga_id_school;
    }
    if (write_access) {
      delete query.where.country_code;
    }
    if (country_iso3_code) {
      const dbCountry = await this.prisma.dailycheckapp_country.findFirst({
        where: { code_iso3: country_iso3_code },
      });
      if (
        !dbCountry?.code ||
        (!write_access && !countries.includes(dbCountry.code))
      ) {
        return [];
      }
      query.where.country_code = { in: [dbCountry.code] };
    }

    const measurements = this.prisma.measurements.findMany(query);
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
    const query = {
      skip,
      take,
      where: {
        giga_id_school,
        country_code: { in: countries },
      },
    };

    if (!giga_id_school) {
      delete query.where.giga_id_school;
    }
    if (write_access) {
      delete query.where.country_code;
    }
    if (country_iso3_code) {
      const dbCountry = await this.prisma.dailycheckapp_country.findFirst({
        where: { code_iso3: country_iso3_code },
      });
      if (
        !dbCountry?.code ||
        (!write_access && !countries.includes(dbCountry.code))
      ) {
        return [];
      }
      query.where.country_code = { in: [dbCountry.code] };
    }

    const measurements = this.prisma.measurements.findMany(query);
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

  async measurementsById(id: string): Promise<MeasurementDto[]> {
    const measurements = this.prisma.measurements.findMany({
      where: { id: parseInt(id) },
    });
    return (await measurements).map(this.toDto);
  }

  async measurementsBySchoolId(school_id: string): Promise<MeasurementDto[]> {
    const measurements = this.prisma.measurements.findMany({
      where: { school_id },
    });
    return (await measurements).map(this.toDto);
  }

  async createMeasurement(measurementDto: MeasurementDto): Promise<string> {
    const model = this.toModel(measurementDto);
    const measurement = await this.prisma.measurements.create({
      data: model,
    });
    return measurement.id.toString();
  }

  private toDto(measurement: Measurement): MeasurementDto {
    return {
      id: measurement.id.toString(),
      Timestamp: measurement.timestamp,
      UUID: measurement.uuid,
      BrowserID: measurement.browser_id,
      school_id: measurement.school_id,
      DeviceType: measurement.device_type,
      Notes: measurement.notes,
      ClientInfo: plainToInstance(ClientInfoDto, measurement.client_info ?? ''),
      ServerInfo: plainToInstance(ServerInfoDto, measurement.server_info ?? ''),
      annotation: measurement.annotation,
      Download: measurement.download,
      Upload: measurement.upload,
      Latency: parseInt(measurement.latency.toString()),
      Results: plainToInstance(ResultsDto, measurement.results ?? ''),
      giga_id_school: measurement.giga_id_school,
      country_code: measurement.country_code,
      ip_address: measurement.ip_address,
      app_version: measurement.app_version,
      source: measurement.source,
      created_at: measurement.created_at,
    };
  }

  private toV2Dto(measurement: Measurement): MeasurementV2Dto {
    return {
      Timestamp: measurement.timestamp,
      BrowserID: measurement.browser_id,
      school_id: measurement.school_id,
      Download: measurement.download,
      Upload: measurement.upload,
      Latency: parseInt(measurement.latency.toString()),
      giga_id_school: measurement.giga_id_school,
      country_code: measurement.country_code,
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
      ClientInfo: plainToInstance(ClientInfoDto, measurement.client_info ?? ''),
      ServerInfo: plainToInstance(ServerInfoDto, measurement.server_info ?? ''),
      annotation: measurement.annotation,
      Download: measurement.download,
      Upload: measurement.upload,
      Latency: parseInt(measurement.latency.toString()),
      Results: plainToInstance(ResultsDto, measurement.results ?? ''),
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
      server_info: JSON.stringify(measurement.ServerInfo),
      annotation: measurement.annotation,
      download: measurement.Download,
      upload: measurement.Upload,
      latency: measurement.Latency,
      results: JSON.stringify(measurement.Results),
      giga_id_school: measurement.giga_id_school?.toLowerCase().trim(),
      country_code: measurement.country_code,
      ip_address: measurement.ip_address,
      app_version: measurement.app_version,
      source: 'DailyCheckApp',
    };
  }
}
