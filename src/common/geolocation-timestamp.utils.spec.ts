import {
  GEOLOCATION_TIMESTAMP_MAX_MS,
  detectedLocationResolvedAt,
  parseGeolocationTimestamp,
} from './geolocation-timestamp.utils';

describe('parseGeolocationTimestamp', () => {
  const ms = Date.UTC(2026, 10, 17, 8, 30, 0, 123); // 2026-11-17T08:30:00.123Z

  it('reads epoch milliseconds sent as a number', () => {
    expect(parseGeolocationTimestamp(ms)).toEqual(new Date(ms));
  });

  it('reads epoch milliseconds sent as a numeric string', () => {
    expect(parseGeolocationTimestamp(String(ms))).toEqual(new Date(ms));
    expect(parseGeolocationTimestamp(` ${ms} `)).toEqual(new Date(ms));
  });

  it('reads an ISO 8601 string', () => {
    expect(parseGeolocationTimestamp('2026-11-17T08:30:00.123Z')).toEqual(
      new Date(ms),
    );
    expect(parseGeolocationTimestamp('2026-11-17T10:30:00.123+02:00')).toEqual(
      new Date(ms),
    );
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['zero', 0],
    ['a negative number', -ms],
    ['a negative numeric string', `-${ms}`],
    ['an empty string', ''],
    ['past year 9999', GEOLOCATION_TIMESTAMP_MAX_MS + 1],
    ['past what a JS Date can hold', 8.64e15 + 1],
    ['a numeric string past year 9999', '99999999999999999'],
    ['an ISO string before 1970', '1969-12-31T23:59:59Z'],
    ['an ISO-looking string that is not a date', '2026-13-45T99:99:99Z'],
    ['garbage text', 'yesterday'],
    ['text with a number in it', 'foo 1'],
    ['a boolean', true],
    ['an object', { ms }],
    ['an array', [ms]],
  ])('returns null for %s', (_label, value) => {
    expect(parseGeolocationTimestamp(value)).toBeNull();
  });

  it('keeps the last instant of year 9999', () => {
    expect(parseGeolocationTimestamp(GEOLOCATION_TIMESTAMP_MAX_MS)).toEqual(
      new Date('9999-12-31T23:59:59.999Z'),
    );
  });
});

describe('detectedLocationResolvedAt', () => {
  const ms = Date.UTC(2026, 10, 17, 8, 30, 0);
  const location = { lat: -25.9692, lng: 32.5732 };

  it('returns the time when a location comes with it', () => {
    expect(detectedLocationResolvedAt({ location, timestamp: ms })).toEqual(
      new Date(ms),
    );
  });

  it('returns null without a location', () => {
    expect(detectedLocationResolvedAt(undefined)).toBeNull();
    expect(detectedLocationResolvedAt(null)).toBeNull();
    expect(detectedLocationResolvedAt({ timestamp: ms })).toBeNull();
    expect(
      detectedLocationResolvedAt({ location: null, timestamp: ms }),
    ).toBeNull();
  });

  it('returns null when the time is not usable', () => {
    expect(detectedLocationResolvedAt({ location })).toBeNull();
    expect(
      detectedLocationResolvedAt({ location, timestamp: 'garbage' }),
    ).toBeNull();
  });
});
