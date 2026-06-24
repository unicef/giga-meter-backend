export const MEASUREMENT_PROVIDERS = ['mlab', 'cloudflare', 'both'] as const;

export type MeasurementProvider = (typeof MEASUREMENT_PROVIDERS)[number];

export type ProtocolConfigSource = 'school' | 'country' | 'default';

export interface ResolvedProtocolConfig {
  measurementProvider: MeasurementProvider;
  betweenTestsDelaySec: number;
  configSource: ProtocolConfigSource;
}

export function isMeasurementProvider(value: string): value is MeasurementProvider {
  return (MEASUREMENT_PROVIDERS as readonly string[]).includes(value);
}
