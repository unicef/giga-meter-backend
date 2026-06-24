import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertCountryProtocolConfigDto } from './protocol-config-upsert-country.dto';
import { UpsertSchoolProtocolConfigDto } from './protocol-config-upsert-school.dto';
import {
  isMeasurementProvider,
  MeasurementProvider,
  ProtocolConfigSource,
  ResolvedProtocolConfig,
} from './protocol-config.types';

export interface CountryProtocolConfigRecord {
  countryCode: string;
  measurementProvider: MeasurementProvider;
  betweenTestsDelaySec: number;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolProtocolConfigRecord {
  gigaIdSchool: string;
  measurementProvider: MeasurementProvider | null;
  betweenTestsDelaySec: number | null;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_RESOLVED: ResolvedProtocolConfig = {
  measurementProvider: 'mlab',
  betweenTestsDelaySec: 0,
  configSource: 'default',
};

@Injectable()
export class ProtocolConfigService {
  constructor(private readonly prisma: PrismaService) {}

  /** Normalize stored DB string to a known provider; invalid values fall back to mlab. */
  private coerceProvider(raw: string): MeasurementProvider {
    const v = raw?.trim()?.toLowerCase();
    if (v && isMeasurementProvider(v)) {
      return v;
    }
    return 'mlab';
  }

  /**
   * Resolve protocol settings with precedence: school -> country -> default.
   * School row applies only when at least one override column is non-null.
   */
  async resolve(
    gigaIdSchool?: string | null,
    countryCode?: string | null,
  ): Promise<ResolvedProtocolConfig> {
    const giga = gigaIdSchool?.trim() || undefined;
    const country = countryCode?.trim() || undefined;

    const [schoolRow, countryRow] = await Promise.all([
      giga
        ? this.prisma.schoolProtocolConfig.findUnique({
            where: { giga_id_school: giga },
          })
        : Promise.resolve(null),
      country
        ? this.prisma.countryProtocolConfig.findUnique({
            where: { country_code: country },
          })
        : Promise.resolve(null),
    ]);

    const schoolMeaningful =
      !!schoolRow &&
      (schoolRow.measurement_provider != null ||
        schoolRow.between_tests_delay_sec != null);

    let measurementProvider: MeasurementProvider =
      DEFAULT_RESOLVED.measurementProvider;
    let betweenTestsDelaySec = DEFAULT_RESOLVED.betweenTestsDelaySec;
    let configSource: ProtocolConfigSource = DEFAULT_RESOLVED.configSource;

    if (countryRow) {
      measurementProvider = this.coerceProvider(countryRow.measurement_provider);
      betweenTestsDelaySec = countryRow.between_tests_delay_sec;
      configSource = 'country';
    }

    if (schoolMeaningful && schoolRow) {
      if (schoolRow.measurement_provider != null) {
        measurementProvider = this.coerceProvider(schoolRow.measurement_provider);
      }
      if (schoolRow.between_tests_delay_sec != null) {
        betweenTestsDelaySec = schoolRow.between_tests_delay_sec;
      }
      configSource = 'school';
    }

    return {
      measurementProvider,
      betweenTestsDelaySec,
      configSource,
    };
  }

  async upsertCountry(
    countryCode: string,
    dto: UpsertCountryProtocolConfigDto,
  ): Promise<CountryProtocolConfigRecord> {
    const code = countryCode?.trim();
    if (!code) {
      throw new BadRequestException('countryCode is required');
    }

    const country = await this.prisma.country.findUnique({
      where: { code },
    });
    if (!country) {
      throw new NotFoundException(`Country ${code} not found`);
    }

    const row = await this.prisma.countryProtocolConfig.upsert({
      where: { country_code: code },
      create: {
        country_code: code,
        measurement_provider: dto.measurementProvider,
        between_tests_delay_sec: dto.betweenTestsDelaySec,
      },
      update: {
        measurement_provider: dto.measurementProvider,
        between_tests_delay_sec: dto.betweenTestsDelaySec,
      },
    });

    return this.mapCountryRow(row);
  }

  async deleteCountry(countryCode: string): Promise<void> {
    const code = countryCode?.trim();
    if (!code) {
      throw new BadRequestException('countryCode is required');
    }

    const result = await this.prisma.countryProtocolConfig.deleteMany({
      where: { country_code: code },
    });
    if (result.count === 0) {
      throw new NotFoundException(
        `Country protocol config for ${code} not found`,
      );
    }
  }

  async upsertSchool(
    gigaIdSchool: string,
    dto: UpsertSchoolProtocolConfigDto,
  ): Promise<SchoolProtocolConfigRecord> {
    const gigaId = gigaIdSchool?.trim();
    if (!gigaId) {
      throw new BadRequestException('gigaIdSchool is required');
    }

    if (
      dto.measurementProvider === undefined &&
      dto.betweenTestsDelaySec === undefined
    ) {
      throw new BadRequestException(
        'At least one of measurementProvider or betweenTestsDelaySec is required',
      );
    }

    if (
      dto.measurementProvider != null &&
      !isMeasurementProvider(dto.measurementProvider)
    ) {
      throw new BadRequestException('measurementProvider is invalid');
    }

    const row = await this.prisma.schoolProtocolConfig.upsert({
      where: { giga_id_school: gigaId },
      create: {
        giga_id_school: gigaId,
        measurement_provider: dto.measurementProvider ?? null,
        between_tests_delay_sec: dto.betweenTestsDelaySec ?? null,
      },
      update: {
        ...(dto.measurementProvider !== undefined
          ? { measurement_provider: dto.measurementProvider }
          : {}),
        ...(dto.betweenTestsDelaySec !== undefined
          ? { between_tests_delay_sec: dto.betweenTestsDelaySec }
          : {}),
      },
    });

    return this.mapSchoolRow(row);
  }

  async deleteSchool(gigaIdSchool: string): Promise<void> {
    const gigaId = gigaIdSchool?.trim();
    if (!gigaId) {
      throw new BadRequestException('gigaIdSchool is required');
    }

    const result = await this.prisma.schoolProtocolConfig.deleteMany({
      where: { giga_id_school: gigaId },
    });
    if (result.count === 0) {
      throw new NotFoundException(
        `School protocol config for ${gigaId} not found`,
      );
    }
  }

  private mapCountryRow(row: {
    country_code: string;
    measurement_provider: string;
    between_tests_delay_sec: number;
    created_at: Date;
    updated_at: Date;
  }): CountryProtocolConfigRecord {
    return {
      countryCode: row.country_code,
      measurementProvider: row.measurement_provider as MeasurementProvider,
      betweenTestsDelaySec: row.between_tests_delay_sec,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  private mapSchoolRow(row: {
    giga_id_school: string;
    measurement_provider: string | null;
    between_tests_delay_sec: number | null;
    created_at: Date;
    updated_at: Date;
  }): SchoolProtocolConfigRecord {
    return {
      gigaIdSchool: row.giga_id_school,
      measurementProvider: row.measurement_provider as MeasurementProvider | null,
      betweenTestsDelaySec: row.between_tests_delay_sec,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }
}
