import { exampleCloudflareMeasurementDto } from './cloudflare-measurement.fixture';
import {
  enrichMeasurementForPersistence,
  extractCloudflareQualityMetrics,
  resolveMeasurementProtocol,
} from './measurement-quality-metrics';

describe('measurement-quality-metrics', () => {
  it('resolves cloudflare only when upload protocol is cloudflare', () => {
    expect(resolveMeasurementProtocol('cloudflare')).toBe('cloudflare');
    expect(resolveMeasurementProtocol('mlab')).toBe('mlab');
    expect(resolveMeasurementProtocol(undefined)).toBe('mlab');
  });

  it('extracts Cloudflare quality metrics from the example payload', () => {
    const metrics = extractCloudflareQualityMetrics(
      exampleCloudflareMeasurementDto.results,
    );

    expect(metrics.download_latency).toBe(
      exampleCloudflareMeasurementDto.results?.summary?.downLoadedLatency,
    );
    expect(metrics.upload_latency).toBe(
      exampleCloudflareMeasurementDto.results?.summary?.upLoadedLatency,
    );
    expect(metrics.download_jitter).toBe(
      exampleCloudflareMeasurementDto.results?.summary?.downLoadedJitter,
    );
    expect(metrics.upload_jitter).toBe(
      exampleCloudflareMeasurementDto.results?.summary?.upLoadedJitter,
    );
    expect(metrics.jitter).toBe(
      exampleCloudflareMeasurementDto.results?.summary?.jitter,
    );
    expect(metrics.packet_loss).toBeNull();
    expect(metrics.network_quality_score).toBe(0);
  });

  it('falls back to latency series when summary fields are missing', () => {
    const metrics = extractCloudflareQualityMetrics({
      downloadedLatency: { latency: 11, jitter: 12 },
      uploadedLatency: { latency: 21, jitter: 22 },
      unloadedLatency: { latency: 31, jitter: 32 },
    });

    expect(metrics.download_latency).toBe(11);
    expect(metrics.upload_latency).toBe(21);
    expect(metrics.download_jitter).toBe(12);
    expect(metrics.upload_jitter).toBe(22);
    expect(metrics.jitter).toBe(32);
  });

  it('averages only available Cloudflare score points', () => {
    const metrics = extractCloudflareQualityMetrics({
      scores: {
        streaming: { points: 10 },
        rtc: { points: 20 },
      },
    });

    expect(metrics.network_quality_score).toBe(15);
  });

  it('returns null metrics for malformed Results without throwing', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    const metrics = extractCloudflareQualityMetrics('not-an-object');

    expect(metrics).toEqual({
      download_latency: null,
      upload_latency: null,
      download_jitter: null,
      upload_jitter: null,
      jitter: null,
      packet_loss: null,
      network_quality_score: null,
    });
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('leaves mlab measurements with null quality metrics', () => {
    const measurement: {
      Results?: unknown;
      protocol?: string;
      download_latency?: number | null;
      upload_latency?: number | null;
      download_jitter?: number | null;
      upload_jitter?: number | null;
      jitter?: number | null;
      packet_loss?: number | null;
      network_quality_score?: number | null;
    } = {
      Results: {
        'NDTResult.S2C': {
          LastServerMeasurement: {
            TCPInfo: { MinRTT: 10000 },
          },
        },
      },
    };

    enrichMeasurementForPersistence(measurement);

    expect(measurement.protocol).toBe('mlab');
    expect(measurement.download_latency).toBeNull();
    expect(measurement.upload_latency).toBeNull();
    expect(measurement.download_jitter).toBeNull();
    expect(measurement.upload_jitter).toBeNull();
    expect(measurement.jitter).toBeNull();
    expect(measurement.packet_loss).toBeNull();
    expect(measurement.network_quality_score).toBeNull();
  });

  it('enriches cloudflare measurements from Results', () => {
    const measurement: {
      Results?: unknown;
      protocol?: string;
      download_latency?: number | null;
      upload_latency?: number | null;
      download_jitter?: number | null;
      upload_jitter?: number | null;
      jitter?: number | null;
      packet_loss?: number | null;
      network_quality_score?: number | null;
    } = {
      Results: exampleCloudflareMeasurementDto.results,
    };

    enrichMeasurementForPersistence(measurement, 'cloudflare');

    expect(measurement.protocol).toBe('cloudflare');
    expect(measurement.download_latency).toBe(
      exampleCloudflareMeasurementDto.results?.summary?.downLoadedLatency,
    );
    expect(measurement.network_quality_score).toBe(0);
  });
});
