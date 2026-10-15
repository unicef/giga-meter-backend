import { Prisma } from '@prisma/client';

/**
 * The v1 read endpoints are a schools-only contract. Health rows written
 * through /api/v2 share the measurements and connectivity_ping_checks tables,
 * so v1 reads keep legacy rows (facility_type_id NULL) and v2 school rows only.
 *
 * Written as an OR on purpose. `NOT { facility_type_id: <health> }` would drop
 * every legacy row, because in SQL `NOT (NULL = x)` is NULL, not true.
 */
export const v1SchoolScope = () => ({
  OR: [
    { facility_type_id: null },
    { facility_type: { is: { code: 'school' } } },
  ],
});

/** Same scope as {@link v1SchoolScope}, for raw SQL on either table. */
export const V1_SCHOOL_SCOPE_SQL = Prisma.sql`(facility_type_id IS NULL OR facility_type_id IN (SELECT id FROM facility_type WHERE code = 'school'))`;

/**
 * A v1 ping row keeps the shape v1 always returned. The facility columns
 * (facility_type_id, registration_id, giga_id_health) are v2 data, and
 * registration_id is a BigInt that JSON serialisation cannot handle.
 */
export const toV1PingRecord = <
  T extends {
    facility_type_id?: unknown;
    registration_id?: unknown;
    giga_id_health?: unknown;
  },
>(
  row: T,
): Omit<T, 'facility_type_id' | 'registration_id' | 'giga_id_health'> => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { facility_type_id, registration_id, giga_id_health, ...v1 } = row;
  return v1;
};
