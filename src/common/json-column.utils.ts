import { Prisma } from '@prisma/client';

/**
 * The value to write to a nullable `Json` column.
 *
 * Prisma stores a JavaScript `null` in a `Json?` column as the JSON literal
 * `null` (`'null'::jsonb`), not as SQL NULL. Those rows pass a
 * `WHERE col IS NOT NULL` filter, so any query or dashboard that uses it
 * silently counts empty records. An absent value has to be sent as
 * `Prisma.DbNull` to land as a real SQL NULL.
 *
 * The persistence models are built as `any`, so the compiler does not catch a
 * plain `null` here; every nullable `Json` field written on create should go
 * through this helper.
 */
export function jsonColumn<T>(
  value: T | null | undefined,
): T | typeof Prisma.DbNull {
  return value == null ? Prisma.DbNull : value;
}
