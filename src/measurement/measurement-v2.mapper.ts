import { Prisma } from '@prisma/client';
import {
  AddMeasurementV2Dto,
} from './measurement.dto';
import {
  extractCloudflareQualityMetrics,
  resolveMeasurementProtocol,
} from './measurement-quality-metrics';
import { normalizeHealthId } from '../utility/utility';
import {
  sanitizeDeviceContext,
  sanitizeSsidSource,
  sanitizeWifiUnavailableReason,
} from '../common/device-context.utils';

/**
 * Row-building aggregates for the v2 ingest path.
 *
 * Deliberately independent of the v1 `MeasurementService.toModel()`: v2 owns a
 * different payload shape (facility_type / registration_id / installation_id,
 * no client-supplied browser_id) and must be free to diverge from v1 without
 * regressing old clients. Each aggregate below maps one coherent group of
 * columns so the groups stay individually testable and reviewable.
 */

/** Server-resolved context that the DTO cannot carry by itself. */
export interface MeasurementV2WriteContext {
  facilityTypeId: number;
  registrationId: bigint | null;
  /** Distance/accuracy/flag resolved server-side; null when not computable. */
  detectedLocation?: {
    distance: number | null;
    accuracy: number | null;
    isFlagged: boolean | null;
  } | null;
}

/**
 * Bytes moved during the test. Sent by the client as `DataDownloaded` /
 * `DataUploaded` / `DataUsage`; stored as BigInt columns.
 */
export function buildDataUsageV2(dto: AddMeasurementV2Dto) {
  return {
    data_downloaded: dto.DataDownloaded ?? null,
    data_uploaded: dto.DataUploaded ?? null,
    data_usage: dto.DataUsage ?? null,
  };
}

/**
 * Protocol + connection-quality columns.
 *
 * These are *derived*, never trusted from the client: the protocol decides
 * whether quality metrics exist at all, and for Cloudflare they are extracted
 * from the raw `Results` blob. An mlab measurement stores nulls, matching the
 * invariant the read side and analytics already assume.
 */
export function buildQualityMetricsV2(dto: AddMeasurementV2Dto) {
  const protocol = resolveMeasurementProtocol(dto.protocol);

  if (protocol !== 'cloudflare') {
    return {
      protocol,
      download_latency: null,
      upload_latency: null,
      download_jitter: null,
      upload_jitter: null,
      jitter: null,
      packet_loss: null,
      network_quality_score: null,
    };
  }

  return { protocol, ...extractCloudflareQualityMetrics(dto.Results) };
}

/**
 * Free-form diagnostics kept for support/debugging. `annotation` is accepted in
 * both casings because the desktop client sends `Annotation`.
 */
export function buildDiagnosticsV2(dto: AddMeasurementV2Dto) {
  return {
    device_type: dto.DeviceType ?? null,
    notes: dto.Notes ?? null,
    client_info: (dto.ClientInfo ?? undefined) as Prisma.InputJsonValue,
    server_info: (dto.ServerInfo ?? undefined) as Prisma.InputJsonValue,
    results: (dto.Results ?? undefined) as Prisma.InputJsonValue,
    annotation: dto.annotation ?? dto.Annotation ?? null,
  };
}

/**
 * Where the device reported itself to be, plus the server-computed verdict on
 * whether that location is plausible for the facility.
 */
export function buildDetectedLocationV2(
  dto: AddMeasurementV2Dto,
  ctx: MeasurementV2WriteContext,
) {
  return {
    detected_latitude: dto.geolocation?.location?.lat ?? null,
    detected_longitude: dto.geolocation?.location?.lng ?? null,
    detected_location_accuracy:
      ctx.detectedLocation?.accuracy ?? dto.detected_location_accuracy ?? null,
    detected_location_distance:
      ctx.detectedLocation?.distance ?? dto.detected_location_distance ?? null,
    detected_location_is_flagged:
      ctx.detectedLocation?.isFlagged ??
      dto.detected_location_is_flagged ??
      null,
  };
}

/** Identity of the install and the facility the measurement belongs to. */
export function buildIdentityV2(
  dto: AddMeasurementV2Dto,
  ctx: MeasurementV2WriteContext,
) {
  return {
    school_id: dto.school_id ?? null,
    giga_id_school: dto.giga_id_school?.toLowerCase().trim() ?? null,
    giga_id_health: dto.giga_id_health ? normalizeHealthId(dto.giga_id_health) : null,
    facility_type_id: ctx.facilityTypeId,
    registration_id: ctx.registrationId,
    // Legacy linking key only — v2 clients no longer mint or echo it.
    browser_id: dto.BrowserID ?? null,
    device_hardware_id: dto.device_hardware_id ?? null,
    windows_username: dto.windows_username ?? null,
    installed_path: dto.installed_path ?? null,
    wifi_connections: (dto.wifi_connections ?? undefined) as
      | Prisma.InputJsonValue
      | undefined,
  };
}

/**
 * Scheduling and device fields. Sanitised exactly like the v1 path so a record
 * stores the same values whichever endpoint it arrives on.
 */
export function buildDeviceInfoV2(dto: AddMeasurementV2Dto) {
  return {
    offline_synced: dto.offline_synced ?? false,
    scheduled_slot: dto.scheduled_slot ?? null,
    scheduled_at: dto.scheduled_at ?? null,
    device_name: dto.device_name ?? null,
    device_model: dto.device_model ?? null,
    device_manufacturer: dto.device_manufacturer ?? null,
    app_build_number: dto.app_build_number ?? null,
    os_version: dto.os_version ?? null,
    wifi_unavailable_reason: sanitizeWifiUnavailableReason(
      dto.wifi_unavailable_reason,
    ),
    ssid_source: sanitizeSsidSource(dto.ssid_source),
    // undefined (not null) leaves the Json column NULL; Prisma rejects a bare null.
    device_context: (sanitizeDeviceContext(dto.device_context) ??
      undefined) as Prisma.InputJsonValue | undefined,
  };
}

/** Composes every aggregate into the row handed to Prisma. */
export function buildMeasurementV2Row(
  dto: AddMeasurementV2Dto,
  ctx: MeasurementV2WriteContext,
): Prisma.measurementsUncheckedCreateInput {
  return {
    timestamp: dto.Timestamp,
    uuid: dto.UUID,
    download: dto.Download,
    upload: dto.Upload,
    latency: dto.Latency,
    country_code: dto.country_code,
    ip_address: dto.ip_address,
    app_version: dto.app_version,
    source: 'DailyCheckApp',
    ...buildIdentityV2(dto, ctx),
    ...buildDataUsageV2(dto),
    ...buildQualityMetricsV2(dto),
    ...buildDiagnosticsV2(dto),
    ...buildDetectedLocationV2(dto, ctx),
    ...buildDeviceInfoV2(dto),
  };
}
