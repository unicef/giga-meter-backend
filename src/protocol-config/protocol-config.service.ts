import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  isMeasurementProvider,
  ResolvedProtocolConfig,
  MeasurementProvider,
  ProtocolConfigSource,
} from './protocol-config.types';

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
}
