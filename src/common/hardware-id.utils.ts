/**
 * Utility for handling problematic hardware IDs
 * Some manufacturers set generic/default hardware IDs that are not unique
 */

// List of known problematic/generic hardware IDs that should be ignored
export const BLOCKED_HARDWARE_IDS = [
  '03000200-0400-0500-0006-000700080009',
  'NO_UUID_AVAILABLE',
  'fefefefe-fefe-fefe-fefe-fefefefefefe',
  '00000000-0000-0000-0000-000000000000',
  '12345678-1234-1234-1234-123456789abc',
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  // Add more problematic IDs here as they are discovered
];

/**
 * Sanitizes a hardware ID by setting it to null if it's in the blocklist
 * @param hardwareId - The hardware ID to check
 * @returns null if the ID is blocked, otherwise returns the original ID
 */
export function sanitizeHardwareId(
  hardwareId: string | null | undefined,
): string | null {
  if (!hardwareId) {
    return null;
  }

  const trimmedId = hardwareId.trim();

  // Check if the hardware ID is in the blocklist (case-insensitive comparison)
  const isBlocked = BLOCKED_HARDWARE_IDS.some(
    (blockedId) => blockedId.toLowerCase() === trimmedId.toLowerCase(),
  );

  if (isBlocked) {
    console.warn(`Blocked hardware ID detected and ignored: ${trimmedId}`);
    return null;
  }

  return trimmedId;
}

/**
 * Checks if a hardware ID is blocked/problematic
 * @param hardwareId - The hardware ID to check
 * @returns true if the ID is blocked, false otherwise
 */
export function isHardwareIdBlocked(
  hardwareId: string | null | undefined,
): boolean {
  if (!hardwareId) {
    return false;
  }

  const trimmedId = hardwareId.trim();

  // Case-insensitive comparison
  return BLOCKED_HARDWARE_IDS.some(
    (blockedId) => blockedId.toLowerCase() === trimmedId.toLowerCase(),
  );
}

/**
 * Filler text board and disk makers leave in serial fields. Many PCs share
 * these, so they can't tell one PC from another. Mirrors the app's list in
 * electron/src/device-context.ts.
 */
export const GENERIC_SERIAL_VALUES = [
  '0',
  'none',
  'null',
  'n/a',
  'na',
  'unknown',
  'invalid',
  'default string',
  'to be filled by o.e.m.',
  'to be filled by oem',
  'system serial number',
  'base board serial number',
  'not applicable',
  'not specified',
  'not available',
  'oem',
];

const MAX_SIGNAL_LENGTH = 128;

/**
 * Cleans one hardware value sent with a registration: trimmed, or null when it
 * is empty, a known placeholder, a single repeated character ("0000000") or
 * too long to be an identifier.
 */
export function cleanDeviceSignal(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_SIGNAL_LENGTH) {
    return null;
  }
  const normalized = trimmed.toLowerCase();
  if (
    GENERIC_SERIAL_VALUES.includes(normalized) ||
    isHardwareIdBlocked(trimmed) ||
    /^(.)\1+$/.test(normalized.replace(/-/g, ''))
  ) {
    return null;
  }
  return trimmed;
}
