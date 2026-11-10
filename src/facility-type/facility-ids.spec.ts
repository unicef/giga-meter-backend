import { BadRequestException } from '@nestjs/common';
import { facilityGigaId } from './facility-ids';

describe('facilityGigaId', () => {
  it('returns the normalised id for the facility type', () => {
    expect(facilityGigaId('school', { giga_id_school: ' ES-1 ', giga_id_health: '' })).toBe('es-1');
    expect(facilityGigaId('health', { giga_id_school: '', giga_id_health: ' HF-Ab ' })).toBe('HF-Ab');
  });

  it.each([
    ['school', { giga_id_health: 'HF-1' }],
    ['school', { giga_id_school: 'ES-1', giga_id_health: 'HF-1' }],
    ['health', { giga_id_school: 'ES-1' }],
    ['clinic', { giga_id_school: 'ES-1' }],
  ])('rejects %s with %p', (type, ids) => {
    expect(() => facilityGigaId(type, ids)).toThrow(BadRequestException);
  });

  it('rejects an id that is not a string with a 400', () => {
    expect(() =>
      facilityGigaId('school', { giga_id_school: 123 as any }),
    ).toThrow('giga_id_school must be a string');
  });
});
