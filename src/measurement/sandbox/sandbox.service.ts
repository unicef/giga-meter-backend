import { Injectable, Logger } from '@nestjs/common';
import { EntityType, MeasurementSandboxDto } from './sandbox.dto';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fixturesJson = require('./fixtures.measurements.json');

interface FixtureFile {
  _generated: string;
  _note: string;
  iso3_to_iso2: Record<string, string>;
  measurements: MeasurementSandboxDto[];
}

interface SandboxQueryOptions {
  skip: number;
  take: number;
  orderBy: string;
  entity_type?: EntityType;
  giga_id_school?: string;
  giga_id_health?: string;
  country_iso3_code?: string;
  filter_by?: string;
  filter_condition?: string;
  filter_value?: Date | null;
}

/**
 * In-memory backing store for the sandbox /v2/sandbox endpoint.
 *
 * Loads the committed JSON fixture at construction time, then services
 * each request by filtering / sorting / paginating that array. No Prisma,
 * no database — see ./fixtures.measurements.json (regenerate via seed.ts).
 *
 * Filter semantics intentionally mirror MeasurementService.applyFilter so
 * vendor polling code that targets the real /v2 endpoint behaves
 * identically against this sandbox.
 */
@Injectable()
export class MeasurementSandboxService {
  private readonly logger = new Logger(MeasurementSandboxService.name);
  private readonly fixtures: ReadonlyArray<MeasurementSandboxDto>;
  private readonly iso3ToIso2: Record<string, string>;

  constructor() {
    const data = fixturesJson as FixtureFile;
    this.fixtures = data.measurements ?? [];
    this.iso3ToIso2 = data.iso3_to_iso2 ?? {};
    this.logger.log(
      `Loaded ${this.fixtures.length} sandbox measurement fixtures across ${
        Object.keys(this.iso3ToIso2).length
      } countries (generated ${data._generated}).`,
    );
  }

  measurementsV2Sandbox(opts: SandboxQueryOptions): MeasurementSandboxDto[] {
    let rows: MeasurementSandboxDto[] = this.fixtures.slice();

    if (opts.entity_type) {
      rows = rows.filter((r) => r.entity_type === opts.entity_type);
    }
    if (opts.giga_id_school) {
      rows = rows.filter((r) => r.giga_id_school === opts.giga_id_school);
    }
    if (opts.giga_id_health) {
      rows = rows.filter((r) => r.giga_id_health === opts.giga_id_health);
    }
    if (opts.country_iso3_code) {
      const iso2 = this.iso3ToIso2[opts.country_iso3_code.toUpperCase()];
      // Unknown ISO3 → empty result, mirroring prod when the country lookup misses.
      if (!iso2) return [];
      rows = rows.filter((r) => r.country_code === iso2);
    }
    if (opts.filter_by && opts.filter_condition && opts.filter_value) {
      rows = applyDateFilter(
        rows,
        opts.filter_by,
        opts.filter_condition,
        opts.filter_value,
      );
    }

    const orderByRaw = opts.orderBy || '-timestamp';
    const orderField = orderByRaw.replace('-', '');
    const isDesc = orderByRaw.startsWith('-');
    rows.sort((a, b) => {
      const av = toTime(getField(a, orderField));
      const bv = toTime(getField(b, orderField));
      return isDesc ? bv - av : av - bv;
    });

    return rows.slice(opts.skip, opts.skip + opts.take);
  }
}

function getField(obj: MeasurementSandboxDto, field: string): unknown {
  return (obj as unknown as Record<string, unknown>)[field];
}

function toTime(v: unknown): number {
  if (v == null) return 0;
  const t = v instanceof Date ? v.getTime() : new Date(v as string).getTime();
  return isNaN(t) ? 0 : t;
}

/**
 * Mirrors MeasurementService.applyFilter date semantics exactly:
 *   lt  → strictly less than parsedDate (start-of-day if no time component)
 *   lte → less-or-equal to parsedDate when time is given, else end-of-day
 *   gt  → greater than parsedDate when time is given, else end-of-day
 *   gte → greater-or-equal to parsedDate (start-of-day if no time component)
 *   eq  → exact match if time given, else range [start-of-day, end-of-day]
 */
function applyDateFilter(
  rows: MeasurementSandboxDto[],
  filter_by: string,
  filter_condition: string,
  filter_value: Date,
): MeasurementSandboxDto[] {
  const parsed = new Date(filter_value);
  const hasTime =
    parsed.getUTCHours() > 0 ||
    parsed.getUTCMinutes() > 0 ||
    parsed.getUTCSeconds() > 0 ||
    parsed.getUTCMilliseconds() > 0;
  const startOfDayMs = parsed.getTime();
  const endOfDay = new Date(filter_value);
  endOfDay.setUTCHours(23, 59, 59, 999);
  const endOfDayMs = endOfDay.getTime();

  return rows.filter((r) => {
    const v = toTime(getField(r, filter_by));
    if (v === 0) return false;

    switch (filter_condition) {
      case 'lt':
        return v < startOfDayMs;
      case 'lte':
        return v <= (hasTime ? startOfDayMs : endOfDayMs);
      case 'gt':
        return v > (hasTime ? startOfDayMs : endOfDayMs);
      case 'gte':
        return v >= startOfDayMs;
      case 'eq':
        return hasTime
          ? v === startOfDayMs
          : v >= startOfDayMs && v <= endOfDayMs;
      default:
        return true;
    }
  });
}
