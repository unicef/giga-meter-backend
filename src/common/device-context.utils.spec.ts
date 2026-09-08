import {
  DEVICE_CONTEXT_MAX_LIST,
  DEVICE_CONTEXT_MAX_STRING,
  sanitizeDeviceContext,
  sanitizeSsidSource,
  sanitizeWifiUnavailableReason,
} from './device-context.utils';

describe('sanitizeDeviceContext', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps every whitelisted key with its expected type', () => {
    const input = {
      connection_type: 'wifi',
      default_gateway: '192.168.1.1',
      dns_servers: ['192.168.1.1', '1.1.1.1'],
      ip_family: 'v4',
      vpn_likely: false,
      vpn_adapter: 'NordLynx',
      link_speed_mbps: 1201,
      net_bytes_rx: 98765,
      net_bytes_tx: 4321,
      cpu_load_percent: 12.5,
      memory_available_mb: 8192,
      disk_free_mb: 256000,
      device_uptime_seconds: 86400,
      device_start_time: '2026-09-07T13:30:00.000Z',
    };

    expect(sanitizeDeviceContext(input)).toEqual(input);
  });

  it('drops keys outside the whitelist', () => {
    const result = sanitizeDeviceContext({
      connection_type: 'ethernet',
      mac_address: '00:11:22:33:44:55',
      neighbour_ssids: ['school-wifi', 'neighbour-wifi'],
      active_connections: 218,
    });

    expect(result).toEqual({ connection_type: 'ethernet' });
  });

  it('drops whitelisted keys whose value has the wrong type', () => {
    const result = sanitizeDeviceContext({
      connection_type: 42,
      vpn_likely: 'yes',
      net_bytes_rx: '98765',
      dns_servers: '1.1.1.1',
      disk_free_mb: 100,
    });

    expect(result).toEqual({ disk_free_mb: 100 });
  });

  it('rejects non-finite numbers', () => {
    const result = sanitizeDeviceContext({
      cpu_load_percent: Number.NaN,
      memory_available_mb: Number.POSITIVE_INFINITY,
      disk_free_mb: 0,
    });

    expect(result).toEqual({ disk_free_mb: 0 });
  });

  it('trims and truncates long strings', () => {
    const long = 'x'.repeat(DEVICE_CONTEXT_MAX_STRING + 50);
    const result = sanitizeDeviceContext({
      default_gateway: '  192.168.1.1  ',
      vpn_adapter: long,
    });

    expect(result.default_gateway).toBe('192.168.1.1');
    expect(result.vpn_adapter).toHaveLength(
      DEVICE_CONTEXT_MAX_STRING,
    );
  });

  it('caps the DNS list and discards non-string entries', () => {
    const many = Array.from(
      { length: DEVICE_CONTEXT_MAX_LIST + 5 },
      (_, i) => `10.0.0.${i}`,
    );

    expect(
      sanitizeDeviceContext({ dns_servers: many }).dns_servers,
    ).toHaveLength(DEVICE_CONTEXT_MAX_LIST);

    expect(
      sanitizeDeviceContext({
        dns_servers: ['1.1.1.1', null, 42, ''],
      }).dns_servers,
    ).toEqual(['1.1.1.1']);
  });

  it('returns null when nothing usable survives', () => {
    expect(sanitizeDeviceContext({ nope: 1 })).toBeNull();
    expect(sanitizeDeviceContext({})).toBeNull();
    expect(sanitizeDeviceContext({ dns_servers: [] })).toBeNull();
  });

  it('returns null for values that are not plain objects', () => {
    expect(sanitizeDeviceContext(null)).toBeNull();
    expect(sanitizeDeviceContext(undefined)).toBeNull();
    expect(sanitizeDeviceContext('wifi')).toBeNull();
    expect(sanitizeDeviceContext([1, 2])).toBeNull();
  });
});

describe('sanitizeWifiUnavailableReason', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each(['no_adapter', 'wlan_service_off', 'location_disabled', 'unknown'])(
    'accepts %s',
    (reason) => {
      expect(sanitizeWifiUnavailableReason(reason)).toBe(reason);
    },
  );

  it('normalizes casing and surrounding whitespace', () => {
    expect(sanitizeWifiUnavailableReason('  Location_Disabled ')).toBe(
      'location_disabled',
    );
  });

  it('returns null for anything else', () => {
    expect(sanitizeWifiUnavailableReason('location off')).toBeNull();
    expect(sanitizeWifiUnavailableReason('')).toBeNull();
    expect(sanitizeWifiUnavailableReason(null)).toBeNull();
    expect(sanitizeWifiUnavailableReason(7)).toBeNull();
  });
});

describe('sanitizeSsidSource', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each(['wlan', 'nlm'])('accepts %s', (source) => {
    expect(sanitizeSsidSource(source)).toBe(source);
  });

  it('returns null for anything else', () => {
    expect(sanitizeSsidSource('netsh')).toBeNull();
    expect(sanitizeSsidSource(undefined)).toBeNull();
  });
});
