/** V1 API backward-compat: maps facility_type field name to legacy entity_type. */
export function toEntityTypeFieldName<T extends { facility_type: 'school' | 'health' }>(
  value: T,
): Omit<T, 'facility_type'> & { entity_type: 'school' | 'health' } {
  const { facility_type, ...rest } = value;
  return { ...rest, entity_type: facility_type };
}

/** V1 API backward-compat: maps legacy entity_type query/body to facility_type. */
export function entityTypeToFacilityType(
  entity_type: 'school' | 'health',
): 'school' | 'health' {
  return entity_type;
}
