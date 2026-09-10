import { mapCloudflareMeasurementToAddDto } from './cloudflare-measurement.mapper';
import { exampleCloudflareMeasurementDto } from './cloudflare-measurement.fixture';

describe('mapCloudflareMeasurementToAddDto', () => {
  it('maps the example Cloudflare payload to AddMeasurementDto', () => {
    const mapped = mapCloudflareMeasurementToAddDto(
      exampleCloudflareMeasurementDto,
    );

    expect(mapped.UUID).toBe(exampleCloudflareMeasurementDto.uuid);
    expect(mapped.BrowserID).toBe(exampleCloudflareMeasurementDto.browserID);
    expect(mapped.school_id).toBe(exampleCloudflareMeasurementDto.schoolID);
    expect(mapped.giga_id_school).toBe(
      exampleCloudflareMeasurementDto.gigaIDSchool,
    );
    expect(mapped.ip_address).toBe(exampleCloudflareMeasurementDto.ipAddress);
    expect(mapped.country_code).toBe(
      exampleCloudflareMeasurementDto.countryCode,
    );
    expect(mapped.DeviceType).toBe(exampleCloudflareMeasurementDto.deviceType);
    expect(mapped.Notes).toBe(exampleCloudflareMeasurementDto.notes);
    expect(mapped.app_version).toBe(exampleCloudflareMeasurementDto.appVersion);
    expect(mapped.Timestamp).toEqual(
      new Date(exampleCloudflareMeasurementDto.timestamp),
    );
    expect(mapped.Download).toBe(
      exampleCloudflareMeasurementDto.results?.summary?.download,
    );
    expect(mapped.Upload).toBe(
      exampleCloudflareMeasurementDto.results?.summary?.upload,
    );
    expect(mapped.Latency).toBe(69);
    expect(mapped.DataDownloaded).toBe(
      exampleCloudflareMeasurementDto.dataUsage?.download,
    );
    expect(mapped.DataUploaded).toBe(
      exampleCloudflareMeasurementDto.dataUsage?.upload,
    );
    expect(mapped.DataUsage).toBe(
      exampleCloudflareMeasurementDto.dataUsage?.total,
    );
    expect(mapped.ClientInfo?.Country).toBe('ES');
    expect(mapped.ClientInfo?.Latitude).toBe(40.4172);
    expect(mapped.ClientInfo?.Longitude).toBe(-3.684);
    expect(mapped.ServerInfo?.City).toBe('Madrid');
    expect(mapped.Results).toEqual(exampleCloudflareMeasurementDto.results);
  });

  it('falls back to bandwidth and unloaded latency when summary is missing', () => {
    const mapped = mapCloudflareMeasurementToAddDto({
      ...exampleCloudflareMeasurementDto,
      results: {
        bandwidth: {
          download: 1000,
          upload: 200,
        },
        unloadedLatency: {
          latency: 42.6,
        },
      },
    });

    expect(mapped.Download).toBe(1000);
    expect(mapped.Upload).toBe(200);
    expect(mapped.Latency).toBe(43);
    expect(mapped.Results).toEqual({
      bandwidth: {
        download: 1000,
        upload: 200,
      },
      unloadedLatency: {
        latency: 42.6,
      },
    });
  });
});
