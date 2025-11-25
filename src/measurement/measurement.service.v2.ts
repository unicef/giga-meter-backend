import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CloudflareMeasurementDto } from './measurement.dto';

@Injectable()
export class MeasurementServiceV2 {
  constructor(private readonly prisma: PrismaService) {}

  async createCloudflareMeasurement(
    measurementDto: CloudflareMeasurementDto,
  ): Promise<void> {
    const timestamp = this.parseMeasurementTimestamp(measurementDto.timestamp);
    const schoolId = measurementDto.schoolID?.trim();

    if (!schoolId) {
      throw new BadRequestException('schoolID is required');
    }

    const normalizedGigaId = measurementDto.gigaIDSchool
      ? measurementDto.gigaIDSchool.toLowerCase().trim()
      : undefined;

    const normalizedCountry = this.normalizeCountryCode(
      measurementDto.countryCode ?? measurementDto.accessInformation?.country,
    );

    const summary =
      (measurementDto.results?.summary as
        | { download?: number; upload?: number; latency?: number }
        | undefined) ?? {};
    const downloadValue = this.toNumberOrUndefined(summary.download) / 1048576;
    const uploadValue = this.toNumberOrUndefined(summary.upload) / 1048576;
    const latencyValue = this.toBigIntOrUndefined(summary.latency);

    const dataDownloaded = this.toNumberOrUndefined(
      measurementDto.dataUsage?.download,
    );
    const dataUploaded = this.toNumberOrUndefined(
      measurementDto.dataUsage?.upload,
    );
    const dataUsage = this.toNumberOrUndefined(measurementDto.dataUsage?.total);

    const clientInfo = measurementDto.accessInformation
      ? (measurementDto.accessInformation as unknown as Prisma.JsonObject)
      : undefined;

    const results = measurementDto.results
      ? (measurementDto.results as unknown as Prisma.JsonValue)
      : undefined;

    const ipAddress =
      measurementDto.ipAddress ?? measurementDto.accessInformation?.ip ?? null;

    const createData = {
      timestamp,
      uuid: measurementDto.uuid,
      browser_id: measurementDto.browserID ?? null,
      school_id: schoolId,
      device_type: measurementDto.deviceType ?? null,
      notes: measurementDto.notes ?? null,
      client_info: clientInfo,
      download: downloadValue,
      upload: uploadValue,
      latency: latencyValue,
      results,
      giga_id_school: normalizedGigaId,
      country_code: normalizedCountry,
      ip_address: ipAddress,
      app_version: measurementDto.appVersion,
      source: measurementDto.provider?.toLowerCase() ?? 'cloudflare',
      data_downloaded: dataDownloaded,
      data_uploaded: dataUploaded,
      data_usage: dataUsage,
    };

    await this.prisma.measurements.create({
      data: createData as Prisma.measurementsUncheckedCreateInput,
    });
  }

  private parseMeasurementTimestamp(timestamp: number | string): Date {
    let epochMillis: number;

    if (typeof timestamp === 'number') {
      epochMillis = timestamp > 9999999999 ? timestamp : timestamp * 1000;
    } else if (typeof timestamp === 'string') {
      const parsed = Date.parse(timestamp);
      if (Number.isNaN(parsed)) {
        throw new BadRequestException('Invalid timestamp');
      }
      epochMillis = parsed;
    } else {
      throw new BadRequestException('Invalid timestamp');
    }

    const date = new Date(epochMillis);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid timestamp');
    }
    return date;
  }

  private normalizeCountryCode(country?: string | null): string | undefined {
    if (!country) {
      return undefined;
    }

    const trimmed = country.trim();
    return trimmed ? trimmed.toUpperCase() : undefined;
  }

  private toNumberOrUndefined(value?: number | null): number | undefined {
    return typeof value === 'number' && Number.isFinite(value)
      ? value
      : undefined;
  }

  private toBigIntOrUndefined(value?: number | null): bigint | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return BigInt(Math.round(value));
    }
    return undefined;
  }

  private extractCoordinates(
    loc?: string | null,
  ): { lat: number; lng: number } | undefined {
    if (!loc || typeof loc !== 'string') {
      return undefined;
    }

    const [latPart, lngPart] = loc.split(',');
    const lat = Number(latPart);
    const lng = Number(lngPart);

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }

    return undefined;
  }
}
