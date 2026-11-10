import { BadRequestException } from '@nestjs/common';
import { normalizeGigaId, normalizeHealthId } from '../utility/utility';

/**
 * Checks that the giga id sent matches the facility type: a school record
 * carries giga_id_school only, a health record giga_id_health only. Empty
 * strings count as absent (the app sends giga_id_school: '' for health).
 *
 * @returns the normalised id for the facility type.
 */
export function facilityGigaId(
  facilityCode: string,
  ids: { giga_id_school?: string | null; giga_id_health?: string | null },
): string {
  for (const key of ['giga_id_school', 'giga_id_health'] as const) {
    const value = ids[key];
    if (value != null && typeof value !== 'string') {
      throw new BadRequestException(`${key} must be a string`);
    }
  }
  const school = normalizeGigaId(ids.giga_id_school);
  const health = normalizeHealthId(ids.giga_id_health);

  if (facilityCode === 'school') {
    if (!school || health) {
      throw new BadRequestException(
        'facility_type "school" needs giga_id_school and no giga_id_health',
      );
    }
    return school;
  }
  if (facilityCode === 'health') {
    if (!health || school) {
      throw new BadRequestException(
        'facility_type "health" needs giga_id_health and no giga_id_school',
      );
    }
    return health;
  }
  throw new BadRequestException(`Unknown facility_type "${facilityCode}"`);
}
