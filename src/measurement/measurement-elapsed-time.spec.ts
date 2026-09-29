import {
  MAX_ELAPSED_TIME_SECONDS,
  normalizeClientElapsedTime,
} from './measurement-elapsed-time';

function results(downloadElapsed: unknown, uploadElapsed: unknown) {
  return {
    'NDTResult.S2C': {
      LastClientMeasurement: { ElapsedTime: downloadElapsed, NumBytes: 1 },
      LastServerMeasurement: { TCPInfo: { ElapsedTime: 10_000_000 } },
    },
    'NDTResult.C2S': {
      LastClientMeasurement: { ElapsedTime: uploadElapsed, NumBytes: 1 },
    },
  };
}

describe('normalizeClientElapsedTime', () => {
  it('converts milliseconds from older Android builds to seconds', () => {
    const value = results(10_234, 9_876);

    expect(normalizeClientElapsedTime(value)).toBe(true);

    expect(value['NDTResult.S2C'].LastClientMeasurement.ElapsedTime).toBe(
      10.234,
    );
    expect(value['NDTResult.C2S'].LastClientMeasurement.ElapsedTime).toBe(
      9.876,
    );
  });

  it('leaves values that are already in seconds unchanged', () => {
    const value = results(10.2, MAX_ELAPSED_TIME_SECONDS);

    expect(normalizeClientElapsedTime(value)).toBe(false);

    expect(value['NDTResult.S2C'].LastClientMeasurement.ElapsedTime).toBe(10.2);
    expect(value['NDTResult.C2S'].LastClientMeasurement.ElapsedTime).toBe(
      MAX_ELAPSED_TIME_SECONDS,
    );
  });

  it('converts each direction on its own', () => {
    const value = results(10.2, 9_876);

    expect(normalizeClientElapsedTime(value)).toBe(true);

    expect(value['NDTResult.S2C'].LastClientMeasurement.ElapsedTime).toBe(10.2);
    expect(value['NDTResult.C2S'].LastClientMeasurement.ElapsedTime).toBe(
      9.876,
    );
  });

  it('does not touch the server TCPInfo ElapsedTime, which is in microseconds', () => {
    const value = results(10_234, 9_876);

    normalizeClientElapsedTime(value);

    expect(
      value['NDTResult.S2C'].LastServerMeasurement.TCPInfo.ElapsedTime,
    ).toBe(10_000_000);
  });

  it.each([
    ['null results', null],
    ['non-object results', 'text'],
    ['an array', []],
    ['no directions', {}],
    ['a null direction', { 'NDTResult.S2C': null }],
    ['no client measurement', { 'NDTResult.S2C': {} }],
    [
      'a null ElapsedTime',
      { 'NDTResult.S2C': { LastClientMeasurement: { ElapsedTime: null } } },
    ],
    [
      'a string ElapsedTime',
      { 'NDTResult.S2C': { LastClientMeasurement: { ElapsedTime: '10234' } } },
    ],
  ])('ignores %s', (_label, value) => {
    const before = JSON.stringify(value);

    expect(normalizeClientElapsedTime(value)).toBe(false);

    expect(JSON.stringify(value)).toBe(before);
  });
});
