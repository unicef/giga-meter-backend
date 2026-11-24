import { Prisma } from '@prisma/client';
import { jsonColumn } from './json-column.utils';

describe('jsonColumn', () => {
  it('maps null to Prisma.DbNull so the column stores SQL NULL', () => {
    expect(jsonColumn(null)).toBe(Prisma.DbNull);
  });

  it('maps undefined to Prisma.DbNull', () => {
    expect(jsonColumn(undefined)).toBe(Prisma.DbNull);
  });

  it('keeps objects, arrays and falsy JSON values as they are', () => {
    const obj = { a: 1 };
    const list = [{ ssid: 'x' }];
    expect(jsonColumn(obj)).toBe(obj);
    expect(jsonColumn(list)).toBe(list);
    expect(jsonColumn([])).toEqual([]);
    expect(jsonColumn({})).toEqual({});
    expect(jsonColumn(0)).toBe(0);
    expect(jsonColumn(false)).toBe(false);
    expect(jsonColumn('')).toBe('');
  });
});
