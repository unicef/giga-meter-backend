import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PostHog } from 'posthog-node';
import { normalizeGigaId } from '../utility/utility';

/**
 * Server-side PostHog events for Giga Meter.
 *
 * The desktop app reports its own flows to PostHog. A few outcomes only exist
 * here, and the app never learns about them: a measurement stored in
 * measurements_failed (the /multiple endpoint answers success when only some
 * records are refused), a location flagged as too far from the school, a
 * school registration request rejected. This service sends those, on the same
 * PostHog person as the device's own events and in the same school and country
 * groups, so they appear on the device's timeline and the app's dashboards.
 *
 * Two levels, as in dailycheckapp_school:
 *   - device: the PostHog person is the device ID (device_id, TECH-8828), one
 *     physical PC across all its app instances. The app identifies itself by
 *     the same ID, which the registration and status endpoints return.
 *   - app instance: each registration row is one app instance (the app under
 *     one Windows user, for one registration; app_instance_id). A device can
 *     have several. Events carry it as the app_instance_id property and the
 *     app_instance group, as the app's own events do.
 * Both are also in the school and country groups.
 *
 * Only problems and flags are sent, never every accepted measurement: the
 * database already counts those.
 *
 * Off unless POSTHOG_API_KEY is set. Never throws: analytics must not break a
 * request.
 *
 * Environment:
 *   POSTHOG_API_KEY  project API key (the same project as the app's builds
 *                    for this environment)
 *   POSTHOG_HOST     defaults to the EU cloud, like the app
 */
@Injectable()
export class AnalyticsService implements OnModuleDestroy {
  private readonly client: PostHog | null;

  constructor() {
    const apiKey = process.env.POSTHOG_API_KEY?.trim();
    if (!apiKey) {
      this.client = null;
      return;
    }
    try {
      this.client = new PostHog(apiKey, {
        host: process.env.POSTHOG_HOST?.trim() || 'https://eu.i.posthog.com',
        flushAt: 20,
        flushInterval: 10000,
      });
    } catch (error) {
      console.warn('[Analytics] PostHog client could not start:', error);
      this.client = null;
    }
  }

  isEnabled(): boolean {
    return this.client !== null;
  }

  /**
   * An event about one device, and the app instance on it when known. Lands
   * on the device's PostHog person when its device ID is known; otherwise (a
   * registration saved without one) it is kept on the school, without a
   * person profile.
   */
  captureDeviceEvent(
    event: string,
    device: {
      deviceId?: string | null;
      gigaId?: string | null;
      countryCode?: string | null;
      appInstanceId?: string | null;
    },
    properties: Record<string, any> = {},
  ): void {
    const deviceId = device.deviceId?.trim() || null;
    const appInstanceId = device.appInstanceId?.trim().toLowerCase() || null;
    const withInstance = { ...properties, app_instance_id: appInstanceId };
    this.send(
      event,
      deviceId ?? schoolDistinctId(device.gigaId),
      groupsFor(device.gigaId, device.countryCode, appInstanceId),
      deviceId
        ? withInstance
        : { ...withInstance, $process_person_profile: false },
    );
  }

  /** An event about a school rather than a device (no person profile). */
  captureSchoolEvent(
    event: string,
    gigaId: string | null | undefined,
    countryCode: string | null | undefined,
    properties: Record<string, any> = {},
  ): void {
    this.send(event, schoolDistinctId(gigaId), groupsFor(gigaId, countryCode), {
      ...properties,
      $process_person_profile: false,
    });
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.client?.shutdown();
    } catch (error) {
      console.warn('[Analytics] PostHog shutdown failed:', error);
    }
  }

  private send(
    event: string,
    distinctId: string,
    groups: Record<string, string>,
    properties: Record<string, any>,
  ): void {
    if (!this.client) {
      return;
    }
    try {
      this.client.capture({
        distinctId,
        event,
        groups,
        properties: {
          ...properties,
          source: 'backend',
          backend_env:
            process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || null,
        },
      });
    } catch (error) {
      console.warn(`[Analytics] capture ${event} failed:`, error);
    }
  }
}

/**
 * Registrations (app instances) that map to one device ID before it counts as
 * an anomaly: likely one hardware signature shared by several PCs (cloned or
 * batch-imaged machines) rather than a PC's own Windows users and logins.
 */
export const DEVICE_REGISTRATIONS_ANOMALY = 5;

function schoolDistinctId(gigaId: string | null | undefined): string {
  const key = normalizeGigaId(gigaId);
  return key ? `school:${key}` : 'giga-meter-backend';
}

/**
 * The app's group keys: giga_id_school as stored (lowercase), ISO country, and
 * the app instance ID (lowercase UUID, as stored).
 */
function groupsFor(
  gigaId: string | null | undefined,
  countryCode: string | null | undefined,
  appInstanceId: string | null = null,
): Record<string, string> {
  const groups: Record<string, string> = {};
  if (appInstanceId) {
    groups.app_instance = appInstanceId;
  }
  const school = normalizeGigaId(gigaId);
  if (school) {
    groups.school = school;
  }
  if (countryCode) {
    groups.country = String(countryCode).toUpperCase();
  }
  return groups;
}

/** Metres in the bands the dashboards use. */
export function distanceBand(meters: number | null | undefined): string {
  if (meters === null || meters === undefined || Number.isNaN(meters)) {
    return 'unknown';
  }
  if (meters < 500) return '<500m';
  if (meters < 4000) return '500m-4km';
  if (meters < 20000) return '4-20km';
  if (meters < 100000) return '20-100km';
  return '100km+';
}

/** Location accuracy (metres) in bands; above 500 m is flagged. */
export function accuracyBand(meters: number | null | undefined): string {
  if (meters === null || meters === undefined || Number.isNaN(meters)) {
    return 'unknown';
  }
  if (meters <= 100) return '<=100m';
  if (meters <= 500) return '100-500m';
  if (meters <= 2000) return '500m-2km';
  return '2km+';
}

/** The reason string MeasurementService stores, as a short code. */
export function rejectionReasonCode(reason: string): string {
  if (/school does not exist/i.test(reason)) return 'school_doesnt_exist';
  if (/wrong country code/i.test(reason)) return 'wrong_country_code';
  return 'other';
}
