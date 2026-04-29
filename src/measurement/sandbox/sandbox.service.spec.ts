import { Test, TestingModule } from '@nestjs/testing';
import { MeasurementSandboxService } from './sandbox.service';

describe('MeasurementSandboxService', () => {
  let service: MeasurementSandboxService;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [MeasurementSandboxService],
    }).compile();
    service = moduleRef.get(MeasurementSandboxService);
  });

  // The committed fixture is deterministic (see seed.ts), so we can assert
  // exact counts without making the test brittle to ordering changes.
  const TOTAL = 100;
  const TOTAL_HEALTH = 12 + 10 + 8 + 10 + 8 + 10; // 58
  const TOTAL_SCHOOL = 8 + 10 + 7 + 5 + 7 + 5; //   42

  it('returns the default page (10 most recent) when no filters are passed', () => {
    const rows = service.measurementsV2Sandbox({
      skip: 0,
      take: 10,
      orderBy: '-timestamp',
    });
    expect(rows).toHaveLength(10);
    // Default order is descending timestamp.
    for (let i = 1; i < rows.length; i++) {
      const prev = new Date(rows[i - 1].timestamp as Date).getTime();
      const cur = new Date(rows[i].timestamp as Date).getTime();
      expect(prev).toBeGreaterThanOrEqual(cur);
    }
  });

  it('paginates correctly: page=1 size=10 returns the next 10 rows', () => {
    const page0 = service.measurementsV2Sandbox({
      skip: 0,
      take: 10,
      orderBy: '-timestamp',
    });
    const page1 = service.measurementsV2Sandbox({
      skip: 10,
      take: 10,
      orderBy: '-timestamp',
    });
    expect(page1).toHaveLength(10);
    // No overlap between pages.
    const p0ids = new Set(page0.map((r) => r.registration_id));
    const p1ids = new Set(page1.map((r) => r.registration_id));
    for (const id of p1ids) expect(p0ids.has(id)).toBe(false);
  });

  it('filters by entity_type=health and never returns school rows', () => {
    const rows = service.measurementsV2Sandbox({
      skip: 0,
      take: 1000,
      orderBy: '-timestamp',
      entity_type: 'health',
    });
    expect(rows).toHaveLength(TOTAL_HEALTH);
    for (const r of rows) {
      expect(r.entity_type).toBe('health');
      expect(r.giga_id_health).toBeTruthy();
      expect(r.giga_id_school).toBeNull();
      expect(r.school_id).toBeNull();
    }
  });

  it('filters by entity_type=school and never returns health rows', () => {
    const rows = service.measurementsV2Sandbox({
      skip: 0,
      take: 1000,
      orderBy: '-timestamp',
      entity_type: 'school',
    });
    expect(rows).toHaveLength(TOTAL_SCHOOL);
    for (const r of rows) {
      expect(r.entity_type).toBe('school');
      expect(r.giga_id_school).toBeTruthy();
      expect(r.giga_id_health).toBeNull();
    }
  });

  it('returns the union when entity_type is omitted', () => {
    const rows = service.measurementsV2Sandbox({
      skip: 0,
      take: 1000,
      orderBy: '-timestamp',
    });
    expect(rows).toHaveLength(TOTAL);
  });

  it('maps country_iso3_code (ISO3) to the stored ISO2 country_code', () => {
    const rows = service.measurementsV2Sandbox({
      skip: 0,
      take: 1000,
      orderBy: '-timestamp',
      country_iso3_code: 'KEN',
    });
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) expect(r.country_code).toBe('KE');
  });

  it('returns empty when given an unknown ISO3 (mirrors prod miss)', () => {
    const rows = service.measurementsV2Sandbox({
      skip: 0,
      take: 1000,
      orderBy: '-timestamp',
      country_iso3_code: 'ZZZ',
    });
    expect(rows).toHaveLength(0);
  });

  it('exact-match filters on giga_id_health', () => {
    const all = service.measurementsV2Sandbox({
      skip: 0,
      take: 1000,
      orderBy: '-timestamp',
      entity_type: 'health',
    });
    const target = all[0].giga_id_health!;
    const rows = service.measurementsV2Sandbox({
      skip: 0,
      take: 1000,
      orderBy: '-timestamp',
      giga_id_health: target,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].giga_id_health).toBe(target);
  });

  it('timestamp gt filter excludes rows at or before the cutoff', () => {
    const cutoff = new Date('2026-04-01T00:00:00Z');
    const rows = service.measurementsV2Sandbox({
      skip: 0,
      take: 1000,
      orderBy: '-timestamp',
      filter_by: 'timestamp',
      filter_condition: 'gt',
      filter_value: cutoff,
    });
    // With "gt" and no time component, the real v2 uses end-of-day as the threshold.
    const endOfDay = new Date(cutoff);
    endOfDay.setUTCHours(23, 59, 59, 999);
    for (const r of rows) {
      expect(new Date(r.timestamp as Date).getTime()).toBeGreaterThan(
        endOfDay.getTime(),
      );
    }
  });

  it('timestamp gte filter mirrors prod start-of-day inclusivity', () => {
    const cutoff = new Date('2026-03-15T00:00:00Z');
    const rows = service.measurementsV2Sandbox({
      skip: 0,
      take: 1000,
      orderBy: '-timestamp',
      filter_by: 'timestamp',
      filter_condition: 'gte',
      filter_value: cutoff,
    });
    for (const r of rows) {
      expect(new Date(r.timestamp as Date).getTime()).toBeGreaterThanOrEqual(
        cutoff.getTime(),
      );
    }
  });

  it('orderBy created_at (asc) returns rows in ascending created_at order', () => {
    const rows = service.measurementsV2Sandbox({
      skip: 0,
      take: 50,
      orderBy: 'created_at',
    });
    for (let i = 1; i < rows.length; i++) {
      const prev = new Date(rows[i - 1].created_at as Date).getTime();
      const cur = new Date(rows[i].created_at as Date).getTime();
      expect(prev).toBeLessThanOrEqual(cur);
    }
  });

  it('combines entity_type + country_iso3_code + timestamp filter', () => {
    const cutoff = new Date('2026-02-01T00:00:00Z');
    const rows = service.measurementsV2Sandbox({
      skip: 0,
      take: 1000,
      orderBy: '-timestamp',
      entity_type: 'health',
      country_iso3_code: 'BRA',
      filter_by: 'timestamp',
      filter_condition: 'gte',
      filter_value: cutoff,
    });
    for (const r of rows) {
      expect(r.entity_type).toBe('health');
      expect(r.country_code).toBe('BR');
      expect(new Date(r.timestamp as Date).getTime()).toBeGreaterThanOrEqual(
        cutoff.getTime(),
      );
    }
  });
});
