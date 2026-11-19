import { ndt7ServerStartTime } from './ndt7-server-time';

const leg = (startTime: unknown) => ({
  LastServerMeasurement: { ConnectionInfo: { StartTime: startTime } },
});

describe('ndt7ServerStartTime', () => {
  it('prefers the download leg and parses it to milliseconds', () => {
    const result = ndt7ServerStartTime({
      'NDTResult.S2C': leg('2026-11-10T12:16:36.535855158Z'),
      'NDTResult.C2S': leg('2026-11-10T12:16:47.100000000Z'),
    });

    expect(result).toEqual(new Date('2026-11-10T12:16:36.535Z'));
  });

  it('falls back to the upload leg when download has no server measurement', () => {
    const result = ndt7ServerStartTime({
      'NDTResult.S2C': {},
      'NDTResult.C2S': leg('2026-11-10T12:16:47.123456789Z'),
    });

    expect(result).toEqual(new Date('2026-11-10T12:16:47.123Z'));
  });

  it('skips a StartTime that cannot be parsed', () => {
    const result = ndt7ServerStartTime({
      'NDTResult.S2C': leg('not a date'),
      'NDTResult.C2S': leg('2026-11-10T12:16:47.123456789Z'),
    });

    expect(result).toEqual(new Date('2026-11-10T12:16:47.123Z'));
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['an empty object', {}],
    ['a numeric StartTime', { 'NDTResult.S2C': leg(1762776996535) }],
    [
      'flat ndt5-style keys',
      { 'NDTResult.S2C.StartTime': '2026-11-10T12:16:36.535855158Z' },
    ],
  ])('returns null for %s', (_label, results) => {
    expect(ndt7ServerStartTime(results)).toBeNull();
  });
});
