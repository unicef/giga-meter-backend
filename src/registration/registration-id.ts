import { BadRequestException } from '@nestjs/common';

/**
 * Parses a client-supplied registration_id. Registration ids are BigInt in the
 * database and travel as strings; a non-numeric value is the client's error,
 * so it becomes a 400 instead of the SyntaxError BigInt() would throw.
 */
export function parseRegistrationId(value: unknown): bigint {
  const raw = String(value ?? '').trim();
  if (!/^\d+$/.test(raw)) {
    throw new BadRequestException(
      `registration_id must be a positive integer, got "${value}"`,
    );
  }
  return BigInt(raw);
}
