import { isUUID } from 'class-validator';

/**
 * An app instance ID as stored: the UUID the app generated for one install
 * (one Windows user, one registration), trimmed and lowercased. Null for a
 * missing value and for anything that isn't a UUID.
 *
 * Measurements and pings use this as it is: a bad ID must not cost the
 * result. A registration refuses a bad ID instead (school.service.ts).
 */
export function normalizeAppInstanceId(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return isUUID(trimmed) ? trimmed.toLowerCase() : null;
}
