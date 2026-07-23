export const MEASUREMENT_PROVIDERS = ['mlab', 'cloudflare'] as const;

export type MeasurementProvider = (typeof MEASUREMENT_PROVIDERS)[number];

export type ProtocolConfigSource = 'school' | 'health' | 'country' | 'default';

export interface ResolvedProtocolConfig {
  measurementProviders: MeasurementProvider[];
  betweenTestsDelaySec: number;
  configSource: ProtocolConfigSource;
}

export function isMeasurementProvider(
  value: string,
): value is MeasurementProvider {
  return (MEASUREMENT_PROVIDERS as readonly string[]).includes(value);
}

/**
 * Normalize a stored provider list to known providers in canonical order
 * (mlab, cloudflare), filtering out invalid values and deduplicating.
 * May return an empty array (e.g. school override absent / all values invalid);
 * callers decide the fallback for their context.
 */
export function coerceProviders(
  raw: readonly string[] | null | undefined,
): MeasurementProvider[] {
  if (!raw) {
    return [];
  }
  const seen = new Set<MeasurementProvider>();
  for (const value of raw) {
    const candidate = value?.trim()?.toLowerCase();
    if (candidate && isMeasurementProvider(candidate)) {
      seen.add(candidate);
    }
  }
  return MEASUREMENT_PROVIDERS.filter((provider) => seen.has(provider));
}
