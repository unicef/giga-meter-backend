// Every ndt7 server message carries ConnectionInfo.StartTime: M-Lab's clock
// when that leg's connection was opened, as an RFC 3339 string with
// nanoseconds (e.g. "2026-11-10T12:16:36.535855158Z"). The app uploads those
// messages unchanged in Results, so the test start time can be read from the
// server's side without trusting the device clock or any client field.

const LEGS = ['NDTResult.S2C', 'NDTResult.C2S'] as const; // download runs first

export function ndt7ServerStartTime(results: any): Date | null {
  for (const leg of LEGS) {
    const value =
      results?.[leg]?.LastServerMeasurement?.ConnectionInfo?.StartTime;
    if (typeof value !== 'string') continue;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return null;
}
