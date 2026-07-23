import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertCountryProtocolConfigDto } from './protocol-config-upsert-country.dto';
import { UpsertSchoolProtocolConfigDto } from './protocol-config-upsert-school.dto';
import { UpsertHealthProtocolConfigDto } from './protocol-config-upsert-health.dto';
import {
  coerceProviders,
  MeasurementProvider,
  ProtocolConfigSource,
  ResolvedProtocolConfig,
} from './protocol-config.types';

export interface CountryProtocolConfigRecord {
  countryCode: string;
  measurementProviders: MeasurementProvider[];
  betweenTestsDelaySec: number;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolProtocolConfigRecord {
  gigaIdSchool: string;
  /** Empty array means the school inherits the provider from country / default. */
  measurementProviders: MeasurementProvider[];
  betweenTestsDelaySec: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface HealthProtocolConfigRecord {
  gigaIdHealth: string;
  /** Empty array means the facility inherits the provider from country / default. */
  measurementProviders: MeasurementProvider[];
  betweenTestsDelaySec: number | null;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_RESOLVED: ResolvedProtocolConfig = {
  measurementProviders: ['mlab'],
  betweenTestsDelaySec: 0,
  configSource: 'default',
};

@Injectable()
export class ProtocolConfigService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve protocol settings with precedence: facility -> country -> default,
   * where "facility" is the school or health-facility override depending on
   * which giga id the caller passed. Providers are stored as arrays; a facility
   * override applies only when it carries at least one provider or a delay
   * value. The universal default is `['mlab']` (mlab is always available).
   *
   * `gigaIdSchool` and `gigaIdHealth` are mutually exclusive; if both are
   * supplied the school override wins.
   */
  async resolve(
    gigaIdSchool?: string | null,
    countryCode?: string | null,
    gigaIdHealth?: string | null,
  ): Promise<ResolvedProtocolConfig> {
    const giga = gigaIdSchool?.trim() || undefined;
    const gigaHealth = gigaIdHealth?.trim() || undefined;
    const country = countryCode?.trim() || undefined;

    const [schoolRow, healthRow, countryRow] = await Promise.all([
      giga
        ? this.prisma.schoolProtocolConfig.findUnique({
            where: { giga_id_school: giga },
          })
        : Promise.resolve(null),
      gigaHealth
        ? this.prisma.healthProtocolConfig.findUnique({
            where: { giga_id_health: gigaHealth },
          })
        : Promise.resolve(null),
      country
        ? this.prisma.countryProtocolConfig.findUnique({
            where: { country_code: country },
          })
        : Promise.resolve(null),
    ]);

    let measurementProviders: MeasurementProvider[] = [
      ...DEFAULT_RESOLVED.measurementProviders,
    ];
    let betweenTestsDelaySec = DEFAULT_RESOLVED.betweenTestsDelaySec;
    let configSource: ProtocolConfigSource = DEFAULT_RESOLVED.configSource;

    if (countryRow) {
      const countryProviders = coerceProviders(
        countryRow.measurement_providers,
      );
      measurementProviders = countryProviders.length
        ? countryProviders
        : [...DEFAULT_RESOLVED.measurementProviders];
      betweenTestsDelaySec = countryRow.between_tests_delay_sec;
      configSource = 'country';
    }

    // School takes precedence over health when both ids are supplied.
    const facilityRow = schoolRow ?? healthRow;
    const facilitySource: ProtocolConfigSource = schoolRow
      ? 'school'
      : 'health';
    const facilityProviders = facilityRow
      ? coerceProviders(facilityRow.measurement_providers)
      : [];
    const facilityMeaningful =
      !!facilityRow &&
      (facilityProviders.length > 0 ||
        facilityRow.between_tests_delay_sec != null);

    if (facilityMeaningful && facilityRow) {
      if (facilityProviders.length > 0) {
        measurementProviders = facilityProviders;
      }
      if (facilityRow.between_tests_delay_sec != null) {
        betweenTestsDelaySec = facilityRow.between_tests_delay_sec;
      }
      configSource = facilitySource;
    }

    return {
      measurementProviders,
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

    const providers = coerceProviders(dto.measurementProviders);
    if (providers.length === 0) {
      throw new BadRequestException('measurementProviders must not be empty');
    }

    const row = await this.prisma.countryProtocolConfig.upsert({
      where: { country_code: code },
      create: {
        country_code: code,
        measurement_providers: providers,
        between_tests_delay_sec: dto.betweenTestsDelaySec,
      },
      update: {
        measurement_providers: providers,
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

    const providersProvided = dto.measurementProviders !== undefined;
    const delayProvided = dto.betweenTestsDelaySec !== undefined;

    if (!providersProvided && !delayProvided) {
      throw new BadRequestException(
        'At least one of measurementProviders or betweenTestsDelaySec is required',
      );
    }

    // `[]` clears the provider override (school inherits from country/default).
    const providers = providersProvided
      ? coerceProviders(dto.measurementProviders)
      : undefined;

    const row = await this.prisma.schoolProtocolConfig.upsert({
      where: { giga_id_school: gigaId },
      create: {
        giga_id_school: gigaId,
        measurement_providers: providers ?? [],
        between_tests_delay_sec: dto.betweenTestsDelaySec ?? null,
      },
      update: {
        ...(providersProvided ? { measurement_providers: providers } : {}),
        ...(delayProvided
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

  async upsertHealth(
    gigaIdHealth: string,
    dto: UpsertHealthProtocolConfigDto,
  ): Promise<HealthProtocolConfigRecord> {
    const gigaId = gigaIdHealth?.trim();
    if (!gigaId) {
      throw new BadRequestException('gigaIdHealth is required');
    }

    const providersProvided = dto.measurementProviders !== undefined;
    const delayProvided = dto.betweenTestsDelaySec !== undefined;

    if (!providersProvided && !delayProvided) {
      throw new BadRequestException(
        'At least one of measurementProviders or betweenTestsDelaySec is required',
      );
    }

    // `[]` clears the provider override (facility inherits from country/default).
    const providers = providersProvided
      ? coerceProviders(dto.measurementProviders)
      : undefined;

    const row = await this.prisma.healthProtocolConfig.upsert({
      where: { giga_id_health: gigaId },
      create: {
        giga_id_health: gigaId,
        measurement_providers: providers ?? [],
        between_tests_delay_sec: dto.betweenTestsDelaySec ?? null,
      },
      update: {
        ...(providersProvided ? { measurement_providers: providers } : {}),
        ...(delayProvided
          ? { between_tests_delay_sec: dto.betweenTestsDelaySec }
          : {}),
      },
    });

    return this.mapHealthRow(row);
  }

  async deleteHealth(gigaIdHealth: string): Promise<void> {
    const gigaId = gigaIdHealth?.trim();
    if (!gigaId) {
      throw new BadRequestException('gigaIdHealth is required');
    }

    const result = await this.prisma.healthProtocolConfig.deleteMany({
      where: { giga_id_health: gigaId },
    });
    if (result.count === 0) {
      throw new NotFoundException(
        `Health protocol config for ${gigaId} not found`,
      );
    }
  }

  private mapCountryRow(row: {
    country_code: string;
    measurement_providers: string[];
    between_tests_delay_sec: number;
    created_at: Date;
    updated_at: Date;
  }): CountryProtocolConfigRecord {
    return {
      countryCode: row.country_code,
      measurementProviders: coerceProviders(row.measurement_providers),
      betweenTestsDelaySec: row.between_tests_delay_sec,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  private mapSchoolRow(row: {
    giga_id_school: string;
    measurement_providers: string[];
    between_tests_delay_sec: number | null;
    created_at: Date;
    updated_at: Date;
  }): SchoolProtocolConfigRecord {
    return {
      gigaIdSchool: row.giga_id_school,
      measurementProviders: coerceProviders(row.measurement_providers),
      betweenTestsDelaySec: row.between_tests_delay_sec,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  private mapHealthRow(row: {
    giga_id_health: string;
    measurement_providers: string[];
    between_tests_delay_sec: number | null;
    created_at: Date;
    updated_at: Date;
  }): HealthProtocolConfigRecord {
    return {
      gigaIdHealth: row.giga_id_health,
      measurementProviders: coerceProviders(row.measurement_providers),
      betweenTestsDelaySec: row.between_tests_delay_sec,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }
}
