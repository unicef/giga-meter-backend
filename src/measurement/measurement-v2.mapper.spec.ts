import {
  buildDataUsageV2,
  buildDiagnosticsV2,
  buildMeasurementV2Row,
  buildQualityMetricsV2,
  MeasurementV2WriteContext,
} from './measurement-v2.mapper';
import { AddMeasurementV2Dto } from './measurement.dto';

const CTX: MeasurementV2WriteContext = {
  facilityTypeId: 2,
  registrationId: BigInt(77),
};

function dto(overrides: Partial<AddMeasurementV2Dto> = {}): AddMeasurementV2Dto {
  return {
    entity_type: 'health',
    giga_id_health: 'ABC-123',
    ...overrides,
  } as AddMeasurementV2Dto;
}

describe('buildDataUsageV2', () => {
  it('maps the three data-usage fields the client sends', () => {
    expect(
      buildDataUsageV2(
        dto({ DataDownloaded: 469, DataUploaded: 296, DataUsage: 765 }),
      ),
    ).toEqual({
      data_downloaded: 469,
      data_uploaded: 296,
      data_usage: 765,
    });
  });

  it('stores nulls when the client omits them', () => {
    expect(buildDataUsageV2(dto())).toEqual({
      data_downloaded: null,
      data_uploaded: null,
      data_usage: null,
    });
  });
});

describe('buildQualityMetricsV2', () => {
  it('defaults to mlab and nulls the quality columns', () => {
    expect(buildQualityMetricsV2(dto())).toEqual({
      protocol: 'mlab',
      download_latency: null,
      upload_latency: null,
      download_jitter: null,
      upload_jitter: null,
      jitter: null,
      packet_loss: null,
      network_quality_score: null,
    });
  });

  it('ignores client-supplied metrics on an mlab measurement', () => {
    const metrics = buildQualityMetricsV2(
      dto({ protocol: 'mlab', jitter: 12, packet_loss: 3 }),
    );

    expect(metrics.jitter).toBeNull();
    expect(metrics.packet_loss).toBeNull();
  });

  it('derives the metrics from Results on a cloudflare measurement', () => {
    const metrics = buildQualityMetricsV2(
      dto({
        protocol: 'cloudflare',
        Results: {
          summary: {
            downLoadedLatency: 41.5,
            upLoadedLatency: 55.25,
            jitter: 3.75,
          },
        },
      }),
    );

    expect(metrics.protocol).toBe('cloudflare');
    expect(metrics.download_latency).toBe(41.5);
    expect(metrics.upload_latency).toBe(55.25);
    expect(metrics.jitter).toBe(3.75);
  });
});

describe('buildDiagnosticsV2', () => {
  it('accepts the legacy capitalised Annotation from the desktop client', () => {
    expect(buildDiagnosticsV2(dto({ Annotation: 'from client' })).annotation).toBe(
      'from client',
    );
  });

  it('prefers the lowercase annotation when both are present', () => {
    expect(
      buildDiagnosticsV2(dto({ annotation: 'canonical', Annotation: 'legacy' }))
        .annotation,
    ).toBe('canonical');
  });

  it('carries the diagnostics blobs through', () => {
    const diagnostics = buildDiagnosticsV2(
      dto({ DeviceType: 'android', Notes: 'manual' }),
    );

    expect(diagnostics.device_type).toBe('android');
    expect(diagnostics.notes).toBe('manual');
  });
});

describe('buildMeasurementV2Row', () => {
  it('normalises giga ids and stamps the server-resolved context', () => {
    const row = buildMeasurementV2Row(
      dto({ giga_id_health: '  ABC-123  ', giga_id_school: 'XYZ-9' }),
      CTX,
    );

    expect(row.giga_id_health).toBe('abc-123');
    expect(row.giga_id_school).toBe('xyz-9');
    expect(row.facility_type_id).toBe(2);
    expect(row.registration_id).toBe(BigInt(77));
    expect(row.source).toBe('DailyCheckApp');
  });

  it('includes every column group in a single row', () => {
    const row = buildMeasurementV2Row(
      dto({ DataUsage: 765, DeviceType: 'android' }),
      CTX,
    );

    expect(row).toEqual(
      expect.objectContaining({
        data_usage: 765,
        device_type: 'android',
        protocol: 'mlab',
        detected_latitude: null,
      }),
    );
  });

  it('prefers the server-computed location verdict over client-supplied values', () => {
    const row = buildMeasurementV2Row(
      dto({
        geolocation: { location: { lat: 41.5, lng: 2.1 }, accuracy: 30 },
        detected_location_distance: 999,
        detected_location_is_flagged: false,
      }),
      {
        ...CTX,
        detectedLocation: { distance: 12, accuracy: 30, isFlagged: true },
      },
    );

    expect(row.detected_latitude).toBe(41.5);
    expect(row.detected_longitude).toBe(2.1);
    expect(row.detected_location_distance).toBe(12);
    expect(row.detected_location_is_flagged).toBe(true);
  });

  it('falls back to client-supplied location fields when nothing was computed', () => {
    const row = buildMeasurementV2Row(
      dto({ detected_location_distance: 999, detected_location_accuracy: 55 }),
      CTX,
    );

    expect(row.detected_location_distance).toBe(999);
    expect(row.detected_location_accuracy).toBe(55);
    expect(row.detected_location_is_flagged).toBeNull();
  });
});
