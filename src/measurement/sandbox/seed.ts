/* eslint-disable no-console */
/**
 * Deterministic seed generator for the sandbox measurements fixture.
 *
 * Run from repo root:
 *   npx ts-node src/measurement/sandbox/seed.ts
 *
 * Reads the per-country health-center CSVs in ./data/, generates one
 * measurement per center per day for a 7-day window in April 2026, and
 * writes the result to fixtures.measurements.json. Output is deterministic
 * — same inputs produce the same JSON, so vendor integrations see stable
 * data across runs.
 *
 * To extend coverage: drop another <iso3>.csv into ./data/, add an entry
 * to COUNTRIES below, re-run, commit the regenerated JSON.
 *
 * download / upload are in bps. latency is in ms.
 */
import * as fs from 'fs';
import * as path from 'path';
import type { MeasurementSandboxDto } from './sandbox.dto';

interface CountrySpec {
  iso3: string;
  iso2: string;
  csvFile: string;
  // Optional per-country window overrides. Default to WINDOW_START / DAYS_IN_WINDOW.
  windowStart?: Date;
  days?: number;
}

// 14-day window: Thursday Jun 11 — Wednesday Jun 24, 2026 (UTC).
const WINDOW_START = new Date('2026-06-11T00:00:00Z');
const DAYS_IN_WINDOW = 14;

// Past-1-week window for the second wave of countries: Wed Jul 1 — Tue Jul 7, 2026 (UTC).
const PAST_WEEK_START = new Date('2026-07-01T00:00:00Z');
const PAST_WEEK_DAYS = 7;

const COUNTRIES: CountrySpec[] = [
  // First wave — 14-day window.
  { iso3: 'UZB', iso2: 'UZ', csvFile: 'uzb.csv' },
  { iso3: 'ZAF', iso2: 'ZA', csvFile: 'zaf.csv' },
  { iso3: 'SLE', iso2: 'SL', csvFile: 'sle.csv' },
  // Second wave — past-1-week window.
  { iso3: 'BEN', iso2: 'BJ', csvFile: 'ben.csv', windowStart: PAST_WEEK_START, days: PAST_WEEK_DAYS },
  { iso3: 'KHM', iso2: 'KH', csvFile: 'khm.csv', windowStart: PAST_WEEK_START, days: PAST_WEEK_DAYS },
  { iso3: 'FJI', iso2: 'FJ', csvFile: 'fji.csv', windowStart: PAST_WEEK_START, days: PAST_WEEK_DAYS },
  { iso3: 'GMB', iso2: 'GM', csvFile: 'gmb.csv', windowStart: PAST_WEEK_START, days: PAST_WEEK_DAYS },
  { iso3: 'KEN', iso2: 'KE', csvFile: 'ken.csv', windowStart: PAST_WEEK_START, days: PAST_WEEK_DAYS },
  { iso3: 'MWI', iso2: 'MW', csvFile: 'mwi.csv', windowStart: PAST_WEEK_START, days: PAST_WEEK_DAYS },
  { iso3: 'MNG', iso2: 'MN', csvFile: 'mng.csv', windowStart: PAST_WEEK_START, days: PAST_WEEK_DAYS },
  { iso3: 'LKA', iso2: 'LK', csvFile: 'lka.csv', windowStart: PAST_WEEK_START, days: PAST_WEEK_DAYS },
];

const ISO3_TO_ISO2: Record<string, string> = {};
for (const c of COUNTRIES) ISO3_TO_ISO2[c.iso3] = c.iso2;

/**
 * Minimal RFC-4180-ish CSV parser: handles double-quoted fields with
 * embedded commas and "" escapes. Sufficient for the healthsite/dhis2
 * exports in ./data/.
 */
function parseCsv(content: string): Array<Record<string, string>> {
  const records: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];

    if (inQuotes) {
      if (ch === '"' && content[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && content[i + 1] === '\n') i++;
      row.push(field);
      if (!(row.length === 1 && row[0] === '')) records.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    records.push(row);
  }

  if (records.length === 0) return [];
  const headers = records[0].map((h) => h.trim());
  return records.slice(1).map((cols) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => (obj[h] = (cols[i] ?? '').trim()));
    return obj;
  });
}

interface Center {
  giga_id_health: string;
}

function loadCenters(country: CountrySpec): Center[] {
  const csvPath = path.join(__dirname, 'data', country.csvFile);
  const content = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCsv(content);
  return rows
    .filter((r) => r.health_id_giga && r.health_id_giga.length > 0)
    .map((r) => ({ giga_id_health: r.health_id_giga }));
}

function generate(): MeasurementSandboxDto[] {
  const rows: MeasurementSandboxDto[] = [];
  let regId = 1000;
  let mIndex = 0;

  for (const country of COUNTRIES) {
    const centers = loadCenters(country);
    const windowStart = country.windowStart ?? WINDOW_START;
    const days = country.days ?? DAYS_IN_WINDOW;
    console.log(`  ${country.iso3}: ${centers.length} health centers`);

    for (const center of centers) {
      regId++;
      const shortId = center.giga_id_health.substring(0, 8);
      // Per-center "time of day" so different centers measure at different
      // hours — keeps timestamps unique and distributes load across the day.
      const hour = (regId * 7) % 24;
      const minute = (regId * 13) % 60;
      const second = (regId * 17) % 60;

      for (let day = 0; day < days; day++) {
        mIndex++;
        const ts = new Date(windowStart.getTime() + day * 86_400_000);
        ts.setUTCHours(hour, minute, second, 0);
        const created = new Date(ts.getTime() + 60_000);

        // download/upload in bps (giga-maps divides by 1,000,000 to show
        // Mbps). Varied across realistic ranges so the vendor sees a
        // believable spread when rendering charts.
        const download = (5_000 + ((mIndex * 137) % 75_000)) * 1_000; // 5 – 80 Mbps
        const upload = (2_000 + ((mIndex * 73) % 38_000)) * 1_000; //   2 – 40 Mbps
        const latency = 30 + ((mIndex * 11) % 250); //                  30 – 280 ms

        rows.push({
          timestamp: ts,
          browserId: `fixture-${shortId}`,
          download,
          upload,
          latency,
          entity_type: 'health',
          school_id: null,
          giga_id_school: null,
          giga_id_health: center.giga_id_health,
          registration_id: String(regId),
          country_code: country.iso2,
          ip_address: `10.${(mIndex % 250) + 1}.${day + 1}.${(regId % 200) + 1}`,
          app_version: '1.2.3',
          source: 'DailyCheckApp',
          created_at: created,
          device_hardware_id: `hw-${center.giga_id_health.substring(0, 12)}`,
        });
      }
    }
  }

  return rows;
}

function main() {
  const rows = generate();
  const out = {
    _generated: new Date().toISOString(),
    _note:
      'Auto-generated by src/measurement/sandbox/seed.ts. Do not edit by hand — re-run the seed to regenerate. download/upload are in bps; latency in ms.',
    iso3_to_iso2: ISO3_TO_ISO2,
    measurements: rows,
  };

  const target = path.join(__dirname, 'fixtures.measurements.json');
  fs.writeFileSync(target, JSON.stringify(out, null, 2) + '\n', 'utf-8');
  console.log(
    `Wrote ${rows.length} fixture rows for ${COUNTRIES.length} countries to ${target}`,
  );
}

main();
