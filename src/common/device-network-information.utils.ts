/**
 * Whitelist for the `device_network_information` Json uploaded with a measurement.
 *
 * Research plan 0008 measured which network and system attributes the Windows
 * client can read; this is the subset that is cheap enough to capture in the
 * measurement path and that the ticket actually asked for. The column is a Json
 * because the shape is still being validated, but an unbounded Json from a client
 * is a data-quality and privacy hazard, so the backend keeps the shape: anything
 * outside this whitelist is dropped instead of stored.
 *
 * Deliberately absent (see the research findings and the UNICEF privacy criteria):
 * adapter MAC addresses, neighbour SSIDs/BSSIDs from the Wi-Fi scan — those only
 * feed geolocation in transit — and the active connection table, which is
 * privacy-heavy with no declared use.
 */

/** Keys accepted inside `device_network_information`, with their expected type. */
export const DEVICE_NETWORK_INFORMATION_SCHEMA: Record<
  string,
  'string' | 'number' | 'boolean' | 'string[]'
> = {
  // --- Network gaps listed in the ticket ---
  connection_type: 'string', // 'wifi' | 'ethernet' | 'cellular' | 'unknown'
  default_gateway: 'string',
  dns_servers: 'string[]',
  ip_family: 'string', // 'v4' | 'v6' | 'dual'
  vpn_likely: 'boolean',
  vpn_adapter: 'string', // name of the candidate adapter behind vpn_likely
  link_speed_mbps: 'number',
  net_bytes_rx: 'number', // cumulative counters; the backend derives deltas
  net_bytes_tx: 'number',
  // --- Cheap performance context around the test ---
  cpu_load_percent: 'number',
  memory_available_mb: 'number',
  disk_free_mb: 'number',
};

/** Longest accepted string value; anything above is truncated. */
export const DEVICE_NETWORK_INFORMATION_MAX_STRING = 128;

/** Most DNS servers kept; a machine reporting more than this is misconfigured. */
export const DEVICE_NETWORK_INFORMATION_MAX_LIST = 8;

function sanitizeStringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const list = value
    .filter((item): item is string => typeof item === 'string' && item !== '')
    .slice(0, DEVICE_NETWORK_INFORMATION_MAX_LIST)
    .map((item) => item.trim().slice(0, DEVICE_NETWORK_INFORMATION_MAX_STRING));
  return list.length > 0 ? list : undefined;
}

function sanitizeValue(
  expected: 'string' | 'number' | 'boolean' | 'string[]',
  value: unknown,
): string | number | boolean | string[] | undefined {
  switch (expected) {
    case 'string':
      if (typeof value !== 'string') return undefined;
      // eslint-disable-next-line no-case-declarations
      const trimmed = value.trim();
      return trimmed === ''
        ? undefined
        : trimmed.slice(0, DEVICE_NETWORK_INFORMATION_MAX_STRING);
    case 'number':
      // Infinity/NaN survive JSON.parse as null, but a client can still send them
      // as strings; only finite numbers are stored.
      return typeof value === 'number' && Number.isFinite(value)
        ? value
        : undefined;
    case 'boolean':
      return typeof value === 'boolean' ? value : undefined;
    case 'string[]':
      return sanitizeStringList(value);
  }
}

/**
 * Keeps only the whitelisted keys of `device_network_information`, coercing each
 * to its expected type and dropping the rest.
 *
 * @returns the sanitized object, or null when nothing usable came through — so an
 *          all-junk payload stores NULL rather than an empty Json.
 */
export function sanitizeDeviceNetworkInformation(
  raw: unknown,
): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  const out: Record<string, unknown> = {};
  const dropped: string[] = [];

  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const expected = DEVICE_NETWORK_INFORMATION_SCHEMA[key];
    if (!expected) {
      dropped.push(key);
      continue;
    }
    const sanitized = sanitizeValue(expected, value);
    if (sanitized !== undefined) {
      out[key] = sanitized;
    }
  }

  if (dropped.length > 0) {
    console.warn(
      `Dropped unexpected device_network_information keys: ${dropped.join(', ')}`,
    );
  }

  return Object.keys(out).length > 0 ? out : null;
}

/** Reasons a Wi-Fi read can come back empty, as classified by the client. */
export const WIFI_UNAVAILABLE_REASONS = [
  'no_adapter',
  'wlan_service_off',
  'location_disabled',
  'unknown',
] as const;

/** Where a reported SSID came from when the WLAN stack is blocked. */
export const SSID_SOURCES = ['wlan', 'nlm'] as const;

function sanitizeEnum(
  value: unknown,
  allowed: readonly string[],
  label: string,
): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === '') return null;
  if (!allowed.includes(normalized)) {
    console.warn(`Unexpected ${label} value ignored: ${normalized}`);
    return null;
  }
  return normalized;
}

/** Null unless the client sent one of the four known reasons. */
export function sanitizeWifiUnavailableReason(value: unknown): string | null {
  return sanitizeEnum(
    value,
    WIFI_UNAVAILABLE_REASONS,
    'wifi_unavailable_reason',
  );
}

/** Null unless the client sent one of the two known SSID sources. */
export function sanitizeSsidSource(value: unknown): string | null {
  return sanitizeEnum(value, SSID_SOURCES, 'ssid_source');
}
