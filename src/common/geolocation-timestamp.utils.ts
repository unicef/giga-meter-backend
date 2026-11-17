/**
 * Reads `geolocation.timestamp` from a measurement upload into the
 * `detected_location_resolved_at` column.
 *
 * The Windows app sends `Date.now()` (Unix epoch milliseconds, from the PC's own
 * clock) taken when it worked the location out from nearby Wi-Fi. When a later
 * lookup fails it re-sends its saved location with that original time, so this
 * is what tells a fresh location from a re-used one. Because it comes from the
 * device clock, compare it with the row's device `timestamp`, not `created_at`.
 *
 * Parsing is tolerant on purpose: a bad value is stored as null and never fails
 * the insert.
 */

// Latest instant kept: 9999-12-31T23:59:59.999Z. Past it the ISO year needs six
// digits, which Prisma and Postgres don't round-trip reliably; nothing real
// sends a later time.
export const GEOLOCATION_TIMESTAMP_MAX_MS = 253402300799999;

const NUMERIC_STRING = /^\s*\d+(\.\d+)?\s*$/;
// Only ISO 8601 dates (2026-11-17, 2026-11-17T10:00:00Z, ...): Date.parse alone
// accepts loose formats that turn garbage into a date.
const ISO_DATE_STRING =
  /^\s*\d{4}-\d{2}-\d{2}([T ][\d:.]+(Z|[+-]\d{2}:?\d{2})?)?\s*$/i;

/**
 * Turns a geolocation timestamp into a Date, or null when it is missing or not
 * a usable time.
 * @param value - epoch milliseconds as a number or numeric string, or an ISO
 * 8601 string
 * @returns the time, or null for anything else (missing, NaN, zero or negative,
 * later than year 9999, or not a date)
 */
export function parseGeolocationTimestamp(value: unknown): Date | null {
  let ms: number;
  if (typeof value === 'number') {
    ms = value;
  } else if (typeof value === 'string' && NUMERIC_STRING.test(value)) {
    ms = Number(value);
  } else if (typeof value === 'string' && ISO_DATE_STRING.test(value)) {
    ms = Date.parse(value.trim());
  } else {
    return null;
  }

  if (!Number.isFinite(ms) || ms <= 0 || ms > GEOLOCATION_TIMESTAMP_MAX_MS) {
    return null;
  }
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * The value for `detected_location_resolved_at`: the geolocation timestamp, but
 * only when the upload also carries a location. Without one there is no
 * detected location for the time to describe.
 */
export function detectedLocationResolvedAt(
  geolocation: { location?: unknown; timestamp?: unknown } | null | undefined,
): Date | null {
  if (!geolocation?.location) {
    return null;
  }
  return parseGeolocationTimestamp(geolocation.timestamp);
}
