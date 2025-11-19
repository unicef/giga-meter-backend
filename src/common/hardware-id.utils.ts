/**
 * Utility for handling problematic hardware IDs
 * Some manufacturers set generic/default hardware IDs that are not unique
 */

// List of known problematic/generic hardware IDs that should be ignored
export const BLOCKED_HARDWARE_IDS = [
  '03000200-0400-0500-0006-000700080009',
  'NO_UUID_AVAILABLE',
  'fefefefe-fefe-fefe-fefe-fefefefefefe',
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
