import { ValidationPipe } from '@nestjs/common';
import { AddMeasurementFacilityV2Dto } from './measurement.dto';

// Same pipe options as POST /api/v2/measurements.
const pipe = new ValidationPipe({ transform: true, validateCustomDecorators: true });
const validate = (body: unknown) =>
  pipe.transform(body, { type: 'body', metatype: AddMeasurementFacilityV2Dto });

// Shape of what the multi-facility app posts (upload.service).
const appPayload = {
  UUID: '6f1b1c7e-0000-4000-8000-000000000001',
  Timestamp: '2026-10-15T08:00:00.000Z',
  timestamplocal: '15/10/2026, 10:00:00',
  Download: 48100,
  Upload: 11200,
  Latency: 21,
  DataDownloaded: 52000000,
  DataUploaded: 13000000,
  DataUsage: 65000000,
  Results: { 'NDTResult.S2C': {} },
  ClientInfo: { IP: '203.0.113.7', Country: 'ES' },
  ServerInfo: { FQDN: 'ndt.example' },
  annotation: '',
  DeviceType: 'windows',
  Notes: 'scheduled',
  school_id: 'GOV-1',
  facility_type: 'health',
  giga_id_school: '',
  giga_id_health: 'HF-1',
  registration_id: '42',
  installation_id: 'inst-1',
  country_code: 'ES',
  ip_address: '203.0.113.7',
  app_version: '2.0.4',
  device_hardware_id: null,
  windows_username: null,
  installed_path: null,
  wifi_connections: null,
  device_name: 'LAB-PC-01',
  device_model: null,
  device_manufacturer: null,
  app_build_number: '2.0.4',
  os_version: null,
  wifi_unavailable_reason: null,
  ssid_source: null,
  device_context: null,
  scheduled_slot: 'morning',
  scheduled_at: '2026-10-15T08:00:00.000Z',
  offline_synced: false,
  server_timestamp: null,
};

describe('POST /api/v2/measurements validation', () => {
  it('accepts the payload the app sends', async () => {
    await expect(validate(appPayload)).resolves.toBeDefined();
  });

  it('rejects a giga_id_school that is not a string with a 400', async () => {
    await expect(validate({ ...appPayload, giga_id_school: 123 })).rejects.toThrow();
  });
});
