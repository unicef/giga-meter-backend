import { BadRequestException } from '@nestjs/common';
import { parseRegistrationId } from './registration-id';

describe('parseRegistrationId', () => {
  it.each([
    ['42', BigInt(42)],
    [42, BigInt(42)],
    [' 987654 ', BigInt(987654)],
  ])('parses %p', (value, expected) => {
    expect(parseRegistrationId(value)).toBe(expected);
  });

  it.each(['abc', '', '-1', '1.5', '12abc', null, undefined])(
    'rejects %p with a 400',
    (value) => {
      expect(() => parseRegistrationId(value)).toThrow(BadRequestException);
    },
  );
});
