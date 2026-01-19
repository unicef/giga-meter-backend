# Blocked Hardware IDs Implementation

## Problem
Some manufacturers set generic/default hardware IDs that are not unique across devices. The following problematic IDs have been identified:
- `03000200-0400-0500-0006-000700080009` - Found on 689 schools
- `NO_UUID_AVAILABLE` - Placeholder value used when UUID generation fails
- `fefefefe-fefe-fefe-fefe-fefefefefefe` - Generic/test UUID pattern

These cause conflicts in device identification and management.

## Solution Implemented
A comprehensive mitigation strategy that sanitizes problematic hardware IDs across all relevant flows.

### Changes Made

#### 1. Created Utility Module (`src/common/hardware-id.utils.ts`)
- **`BLOCKED_HARDWARE_IDS`**: Array of known problematic hardware IDs
- **`sanitizeHardwareId()`**: Converts blocked IDs to `null`
- **`isHardwareIdBlocked()`**: Checks if a hardware ID is in the blocklist

#### 2. School Registration (`src/school/school.service.ts`)
- **Modified `toModel()` method**: Sanitizes hardware ID during school creation
- Blocked hardware IDs are stored as `null` in the database

#### 3. Measurement Creation (`src/measurement/measurement.service.ts`)
- **Modified `toModel()` method**: Sanitizes hardware ID during measurement creation
- Blocked hardware IDs are stored as `null` in the database

#### 4. Check Existing Installation (`src/school/school.service.ts`)
- **Modified `checkExistingInstallation()` method**: 
  - Returns `exists: false` for blocked hardware IDs
  - Prevents false positives from generic hardware IDs
  - Logs warning when blocked ID is detected

#### 5. Check Device Status (`src/school/school.service.ts`)
- **Modified `checkDeviceStatus()` method**:
  - Returns `is_active: true, exists: false` for blocked hardware IDs
  - Allows device operation to continue normally
  - Logs warning when blocked ID is detected

#### 6. Deactivate Device / Logout (`src/school/school.service.ts`)
- **Modified `deactivateDevice()` method**:
  - Returns `deactivated: false` with appropriate message for blocked hardware IDs
  - Prevents deactivation operations on generic hardware IDs
  - Logs warning when blocked ID is detected

### Behavior

| Flow | Input | Old Behavior | New Behavior |
|------|-------|--------------|--------------|
| **Registration** | Blocked hardware ID | Stored as-is | Stored as `null` |
| **Measurement** | Blocked hardware ID | Stored as-is | Stored as `null` |
| **Check Existing** | Blocked hardware ID | May return false positive | Returns `exists: false` |
| **Check Status** | Blocked hardware ID | May return incorrect status | Returns active, not found |
| **Deactivate** | Blocked hardware ID | May affect wrong device | Returns error, no action |

### Adding New Blocked IDs

To add more problematic hardware IDs to the blocklist:

1. Edit `src/common/hardware-id.utils.ts`
2. Add the new ID to the `BLOCKED_HARDWARE_IDS` array:

```typescript
export const BLOCKED_HARDWARE_IDS = [
  '03000200-0400-0500-0006-000700080009',
  'NEW-BLOCKED-ID-HERE',
  // Add more as needed
];
```

3. The change will automatically apply to all flows

### Monitoring

All blocked hardware ID detections are logged with warnings:
- `"Blocked hardware ID detected and ignored: {id}"`
- `"Blocked hardware ID provided to checkExistingInstallation: {id}"`
- `"Blocked hardware ID provided to checkDeviceStatus: {id}"`
- `"Blocked hardware ID provided to deactivateDevice: {id}"`

Monitor these logs to identify if additional hardware IDs need to be blocked.

### Database Impact

**Existing Records**: The 689 schools with the blocked hardware ID will remain in the database as-is. However:
- New registrations with this ID will have it set to `null`
- New measurements with this ID will have it set to `null`
- Queries using this ID will return "not found"

**Cleaning Existing Data**: If needed, run this SQL to clean existing records:

```sql
-- Set blocked hardware IDs to NULL in existing records
UPDATE dailycheckapp_school 
SET device_hardware_id = NULL 
WHERE device_hardware_id IN (
  '03000200-0400-0500-0006-000700080009',
  'NO_UUID_AVAILABLE',
  'fefefefe-fefe-fefe-fefe-fefefefefefe'
);

UPDATE measurements 
SET device_hardware_id = NULL 
WHERE device_hardware_id IN (
  '03000200-0400-0500-0006-000700080009',
  'NO_UUID_AVAILABLE',
  'fefefefe-fefe-fefe-fefe-fefefefefefe'
);
```

### Testing

Test the following scenarios:
1. ✅ Register a school with blocked hardware ID → Should store as `null`
2. ✅ Create measurement with blocked hardware ID → Should store as `null`
3. ✅ Check existing installation with blocked ID → Should return `exists: false`
4. ✅ Check device status with blocked ID → Should return active, not found
5. ✅ Deactivate device with blocked ID → Should fail gracefully

### Future Improvements

Consider implementing:
1. Database migration to clean existing blocked hardware IDs
2. Admin API endpoint to manage blocked IDs dynamically
3. Analytics to identify new problematic hardware ID patterns
4. Client-side validation to detect and warn about generic hardware IDs

