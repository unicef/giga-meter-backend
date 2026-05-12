import { CloudflareMeasurementResultsDto } from './cloudflare-measurement.dto';

export type PersistedMeasurementProtocol = 'mlab' | 'cloudflare';

export interface MeasurementQualityMetrics {
  download_latency?: number | null;
  upload_latency?: number | null;
  download_jitter?: number | null;
  upload_jitter?: number | null;
  jitter?: number | null;
  packet_loss?: number | null;
  network_quality_score?: number | null;
}

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }

  return value;
}

function firstFiniteNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    const parsed = toFiniteNumber(value);
    if (parsed !== undefined) {
      return parsed;
    }
  }

  return undefined;
}

function averageFiniteNumbers(values: number[]): number | undefined {
  if (!values.length) {
    return undefined;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asCloudflareResults(
  results: unknown,
): CloudflareMeasurementResultsDto | undefined {
  if (!isRecord(results)) {
    return undefined;
  }

  return results as CloudflareMeasurementResultsDto;
}

function extractPacketLoss(
  results: CloudflareMeasurementResultsDto,
): number | undefined {
  const packetLoss = results.packetLoss;
  if (!isRecord(packetLoss)) {
    return undefined;
  }

  const directValue = firstFiniteNumber(
    packetLoss.value,
    packetLoss.packetLoss,
    packetLoss.percent,
    packetLoss.loss,
  );
  if (directValue !== undefined) {
    return directValue;
  }

  const details = packetLoss.details;
  if (!isRecord(details)) {
    return undefined;
  }

  const detailsValue = firstFiniteNumber(
    details.value,
    details.packetLoss,
    details.percent,
    details.loss,
  );
  if (detailsValue !== undefined) {
    return detailsValue;
  }

  if (typeof details.error === 'string' && details.error.length > 0) {
    console.warn(
      'Cloudflare packetLoss details contain an error; leaving packet_loss null',
    );
  }

  return undefined;
}

function extractNetworkQualityScore(
  results: CloudflareMeasurementResultsDto,
): number | undefined {
  const scores = results.scores;
  if (!isRecord(scores)) {
    return undefined;
  }

  const scorePoints = ['streaming', 'gaming', 'rtc']
    .map((key) => {
      const entry = scores[key];
      if (!isRecord(entry)) {
        return undefined;
      }

      return toFiniteNumber(entry.points);
    })
    .filter((value): value is number => value !== undefined);

  return averageFiniteNumbers(scorePoints);
}

export function extractCloudflareQualityMetrics(
  results: unknown,
): MeasurementQualityMetrics {
  const cloudflareResults = asCloudflareResults(results);
  if (!cloudflareResults) {
    if (results != null) {
      console.warn(
        'Unexpected Cloudflare Results structure; leaving quality metrics null',
      );
    }

    return {
      download_latency: null,
      upload_latency: null,
      download_jitter: null,
      upload_jitter: null,
      jitter: null,
      packet_loss: null,
      network_quality_score: null,
    };
  }

  const summary = cloudflareResults.summary;
  const unloadedLatency = cloudflareResults.unloadedLatency;
  const downloadedLatency = cloudflareResults.downloadedLatency;
  const uploadedLatency = cloudflareResults.uploadedLatency;

  return {
    download_latency:
      firstFiniteNumber(
        summary?.downLoadedLatency,
        downloadedLatency?.latency,
      ) ?? null,
    upload_latency:
      firstFiniteNumber(summary?.upLoadedLatency, uploadedLatency?.latency) ??
      null,
    download_jitter:
      firstFiniteNumber(summary?.downLoadedJitter, downloadedLatency?.jitter) ??
      null,
    upload_jitter:
      firstFiniteNumber(summary?.upLoadedJitter, uploadedLatency?.jitter) ??
      null,
    jitter: firstFiniteNumber(summary?.jitter, unloadedLatency?.jitter) ?? null,
    packet_loss: extractPacketLoss(cloudflareResults) ?? null,
    network_quality_score:
      extractNetworkQualityScore(cloudflareResults) ?? null,
  };
}

export function resolveMeasurementProtocol(
  uploadProtocol?: string,
): PersistedMeasurementProtocol {
  return uploadProtocol === 'cloudflare' ? 'cloudflare' : 'mlab';
}

export function enrichMeasurementForPersistence(
  measurement: {
    Results?: unknown;
    protocol?: string;
    download_latency?: number | null;
    upload_latency?: number | null;
    download_jitter?: number | null;
    upload_jitter?: number | null;
    jitter?: number | null;
    packet_loss?: number | null;
    network_quality_score?: number | null;
  },
  uploadProtocol?: string,
): void {
  const protocol = resolveMeasurementProtocol(uploadProtocol);
  measurement.protocol = protocol;

  if (protocol !== 'cloudflare') {
    measurement.download_latency = null;
    measurement.upload_latency = null;
    measurement.download_jitter = null;
    measurement.upload_jitter = null;
    measurement.jitter = null;
    measurement.packet_loss = null;
    measurement.network_quality_score = null;
    return;
  }

  const metrics = extractCloudflareQualityMetrics(measurement.Results);
  measurement.download_latency = metrics.download_latency ?? null;
  measurement.upload_latency = metrics.upload_latency ?? null;
  measurement.download_jitter = metrics.download_jitter ?? null;
  measurement.upload_jitter = metrics.upload_jitter ?? null;
  measurement.jitter = metrics.jitter ?? null;
  measurement.packet_loss = metrics.packet_loss ?? null;
  measurement.network_quality_score = metrics.network_quality_score ?? null;
}
