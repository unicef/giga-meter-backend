import { PostHog } from 'posthog-node';
import {
  AnalyticsService,
  accuracyBand,
  distanceBand,
  rejectionReasonCode,
} from './analytics.service';

jest.mock('posthog-node');

const DEVICE_ID = '7d0f5c1e-3a52-4f7e-9a0c-2b9f1f6d4e21';

describe('AnalyticsService', () => {
  const originalKey = process.env.POSTHOG_API_KEY;

  afterEach(() => {
    process.env.POSTHOG_API_KEY = originalKey;
    jest.clearAllMocks();
  });

  it('puts distances and accuracies in the dashboard bands', () => {
    expect(distanceBand(120)).toBe('<500m');
    expect(distanceBand(4500)).toBe('4-20km');
    expect(distanceBand(null)).toBe('unknown');
    expect(accuracyBand(80)).toBe('<=100m');
    expect(accuracyBand(900)).toBe('500m-2km');
  });

  it('turns the stored refusal reasons into codes', () => {
    expect(rejectionReasonCode('PCDC school does not exist')).toBe(
      'school_doesnt_exist',
    );
    expect(rejectionReasonCode('Wrong country code')).toBe(
      'wrong_country_code',
    );
    expect(rejectionReasonCode('something else')).toBe('other');
  });

  it('does nothing without POSTHOG_API_KEY', () => {
    delete process.env.POSTHOG_API_KEY;
    const service = new AnalyticsService();

    expect(service.isEnabled()).toBe(false);
    expect(() =>
      service.captureDeviceEvent('server_measurement_rejected', {
        deviceId: DEVICE_ID,
      }),
    ).not.toThrow();
    expect(PostHog).not.toHaveBeenCalled();
  });

  describe('with a key', () => {
    let capture: jest.Mock;

    beforeEach(() => {
      process.env.POSTHOG_API_KEY = 'phc_test';
      capture = jest.fn();
      (PostHog as unknown as jest.Mock).mockImplementation(() => ({
        capture,
        shutdown: jest.fn().mockResolvedValue(undefined),
      }));
    });

    it("sends a device event on the device ID's person, in its school and country groups", () => {
      new AnalyticsService().captureDeviceEvent(
        'server_measurement_rejected',
        { deviceId: DEVICE_ID, gigaId: ' GigaID1 ', countryCode: 'es' },
        { reason: 'school_doesnt_exist' },
      );

      expect(capture).toHaveBeenCalledWith({
        distinctId: DEVICE_ID,
        event: 'server_measurement_rejected',
        groups: { school: 'gigaid1', country: 'ES' },
        properties: expect.objectContaining({
          reason: 'school_doesnt_exist',
          source: 'backend',
        }),
      });
    });

    it('puts an event from an app instance in its app_instance group too', () => {
      new AnalyticsService().captureDeviceEvent('server_device_registered', {
        deviceId: DEVICE_ID,
        gigaId: 'gigaid1',
        countryCode: 'ES',
        appInstanceId: '3F2B8C1A-6D4E-4F7A-9B2C-1E5D8A7F6C3B',
      });

      expect(capture).toHaveBeenCalledWith(
        expect.objectContaining({
          distinctId: DEVICE_ID,
          groups: {
            app_instance: '3f2b8c1a-6d4e-4f7a-9b2c-1e5d8a7f6c3b',
            school: 'gigaid1',
            country: 'ES',
          },
          properties: expect.objectContaining({
            app_instance_id: '3f2b8c1a-6d4e-4f7a-9b2c-1e5d8a7f6c3b',
          }),
        }),
      );
    });

    it('keeps an event without a device ID on the school, off person profiles', () => {
      new AnalyticsService().captureDeviceEvent('server_device_deactivated', {
        deviceId: null,
        gigaId: 'gigaid1',
      });

      expect(capture).toHaveBeenCalledWith(
        expect.objectContaining({
          distinctId: 'school:gigaid1',
          properties: expect.objectContaining({
            $process_person_profile: false,
          }),
        }),
      );
    });

    it('never throws when the client fails', () => {
      capture.mockImplementation(() => {
        throw new Error('boom');
      });
      expect(() =>
        new AnalyticsService().captureSchoolEvent(
          'server_registration_rejected',
          'gigaid1',
          null,
        ),
      ).not.toThrow();
    });
  });
});
