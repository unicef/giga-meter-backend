/**
 * `LastClientMeasurement.ElapsedTime` in an ndt7 result is in seconds: the
 * desktop client and the web app send seconds, and so does the Android app
 * once it runs the Go ndt7 client. Earlier Android builds sent milliseconds,
 * and devices keep running those builds after the release.
 *
 * An ndt7 direction lasts about 10 seconds and never close to 100, while the
 * same duration in milliseconds is in the thousands. A value above
 * MAX_ELAPSED_TIME_SECONDS can therefore only be milliseconds.
 */
export const MAX_ELAPSED_TIME_SECONDS = 100;

const NDT_DIRECTIONS = ['NDTResult.S2C', 'NDTResult.C2S'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Converts a millisecond `LastClientMeasurement.ElapsedTime` to seconds in
 * both directions of `results`, in place. Returns true if anything changed.
 */
export function normalizeClientElapsedTime(results: unknown): boolean {
  if (!isRecord(results)) {
    return false;
  }

  let changed = false;
  for (const direction of NDT_DIRECTIONS) {
    const summary = results[direction];
    if (!isRecord(summary)) {
      continue;
    }
    const client = summary.LastClientMeasurement;
    if (!isRecord(client)) {
      continue;
    }
    const elapsed = client.ElapsedTime;
    if (
      typeof elapsed === 'number' &&
      Number.isFinite(elapsed) &&
      elapsed > MAX_ELAPSED_TIME_SECONDS
    ) {
      client.ElapsedTime = elapsed / 1000;
      changed = true;
    }
  }
  return changed;
}
