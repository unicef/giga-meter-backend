# Health Facility V1/V2 — Backend Refactor Plan

> **Context:** The Prisma migrations in `health-entity-v1-migration-status.md` are complete, including
> `20260624120000_rename_entity_type_to_facility_type` (entity → facility naming).
> This document describes the application-layer work needed to expose and use those schema changes.
>
> **Goal:** Support health facilities alongside schools. **V2** (`/api/v2/*`) is the canonical API with
> `facility_type` naming. **V1** (`/api/v1/*`) remains for backward compatibility with `entity_type` in JSON.

---

## Table of Contents

1. [Schema Changes Reference](#1-schema-changes-reference)
2. [Table Ownership Clarification](#2-table-ownership-clarification)
3. [New Modules to Create](#3-new-modules-to-create)
4. [Modules to Refactor](#4-modules-to-refactor)
5. [Backward-Compatible Adapter Controllers](#5-backward-compatible-adapter-controllers) — [Route Summary](#54-route-summary) · [Payload & Response Examples](#55-route-payload--response-examples)
6. [Entity Lifecycle Flows](#6-entity-lifecycle-flows)
7. [Testing Strategy](#7-testing-strategy)
8. [Implementation Order](#8-implementation-order)
9. [Open Items & Decisions](#9-open-items--decisions)

---

## 1. Schema Changes Reference

The migrations added the following models and column changes that drive this refactor:

### New tables

| Prisma model | Key fields | Purpose |
|---|---|---|
| `facility_type` | `id`, `name`, `code` (UNIQUE) | Discriminator — seed rows: `{ name:"school", code:"school" }`, `{ name:"health", code:"health" }` |
| `health` | `health_id_giga`, `facility_name`, `latitude`, `longitude`, `country_code`, … | Health facility master record (mirrors `school`) |
| `registration` | `facility_type_id`, `school_id?`, `health_id?`, `giga_id_school?`, `giga_id_health?`, `installation_id` | Facility-agnostic device registration — replaces `dailycheckapp_school` for all new writes |
| `country_facility_type_whitelist` | `country_code`, `facility_type_id` | Per-country activation gate for facility types |
| `master_sync_health_static` | mirrors `master_sync_school_static` | Versioned snapshot table for health facilities |
| `master_sync_intermediate_health` | mirrors `master_sync_intermediate` | Staging table for inbound health data |

### Modified tables

| Table | New columns | Notes |
|---|---|---|
| `measurements` | `facility_type_id Int?`, `registration_id BigInt?`, `giga_id_health String?` | `school_id` made nullable |
| `connectivity_ping_checks` | `facility_type_id Int?`, `registration_id BigInt?`, `giga_id_health String?` | `giga_id_school` made nullable |
| `school` | `+ registrations registration[]` back-relation | No column added |
| `country` | `+ healths health[]`, `+ whitelist_entries …`, `+ master_sync_intermediate_health[]` | No column added |

### Seed data prerequisite

`facility_type` rows (`school`, `health`) **must exist before any application code runs** that resolves facility types by name/code. See `health-entity-v1-migration-status.md` §4.

---

## 2. Table Ownership Clarification

Three tables handle "registration" concepts and are often confused. Understanding their distinct roles is critical before implementing anything.

| Table | Purpose | V1 Write policy |
|---|---|---|
| `dailycheckapp_school` | **Legacy device registration.** One row per device install associated with a school. This was the source of truth for school device context (blocked status, hardware ID, etc.). | **Read-only from V1 onwards.** No new rows written here by application code. |
| `school_new_registration` | **School facility approval workflow.** Tracks new school applications — maps `school_id` + `giga_id_school` through a verification/approval pipeline. Unrelated to device auth. | Unchanged in V1. `SchoolRegistrationService` continues writing here. |
| `registration` | **New entity-agnostic device registration.** Replaces `dailycheckapp_school` for all new device registrations (school and health). Written by `RegistrationService` via `POST /api/v1/registration` — entity type is inferred from whichever Giga ID (`giga_id_school` or `giga_id_health`) is supplied. School device migration from `dailycheckapp_school` → `registration` is a separate Python script task. | **All new device registrations in V1.** |

**Device token auth is stateless.** `AuthGuard` validates `Device` scheme tokens using `DeviceTokenService`, which decrypts an AES-256-GCM token and checks expiry — **no database lookup of any registration table occurs during token validation**. The `is_blocked` field on `registration` (and `dailycheckapp_school`) must be enforced at the service layer (e.g., in `MeasurementService.createMeasurement`), not in the auth guard.

---

## 3. New Modules to Create

### 3.1 `facility-type` module

**Location:** `src/facility-type/`

**Purpose:** Shared service for resolving `facility_type` rows by name or code. Used internally by registration, measurement, and guard logic — not exposed as a public HTTP API.

**Files:**

```
src/entity-type/
  entity-type.service.ts       # EntityTypeService
  entity-type.module.ts        # exports EntityTypeService
```

**`EntityTypeService` contract:**

```ts
getByCode(code: 'school' | 'health'): Promise<entity_type>
getById(id: number): Promise<entity_type>
```

Cache the two known rows in memory on first load (they are static). This avoids a DB round-trip on every inbound request.

---

### 3.2 `health` module

**Location:** `src/health/`

**Purpose:** CRUD and lookup for health facility master records. Mirrors `src/school/`.

**Files:**

```
src/health/
  health.module.ts
  health.controller.ts         # GET /api/v1/health, GET /api/v1/health/giga-id/:giga_id
  health.service.ts
  health.dto.ts
  health.service.spec.ts
  health.controller.spec.ts
```

**Key DTO fields** (drawn directly from `health` Prisma model):

```ts
class HealthDto {
  id: bigint;
  health_id_giga: string;
  facility_name: string;
  facility_type_govt?: string;
  facility_level?: string;
  latitude: number;
  longitude: number;
  country_code?: string;
  admin1?: string;
  admin2?: string;
  connectivity?: string;
  is_facility_open?: boolean;
  // … all remaining optional fields from schema
}

class HealthListQueryDto {
  country_code?: string;
  page?: number;
  size?: number;     // max 100
  orderBy?: string;
}
```

**`HealthService` methods:**

```ts
findAll(query: HealthListQueryDto, countries?: string[]): Promise<HealthDto[]>
findByGigaId(giga_id: string): Promise<HealthDto>
getCoordinates(giga_id_health: string): Promise<{ latitude: number; longitude: number } | null>
```

`getCoordinates` reads `latitude` and `longitude` directly from the `health` row (plain `Float` columns — no PostGIS `geopoint`). This is consumed by `FacilityGeolocationUtility` (§4.3).

**Auth:** GET endpoints require `AuthGuard` Bearer token + read-access country scoping (same pattern as `school.controller.ts`).

---

### 3.3 `registration` module

**Location:** `src/registration/`

**Purpose:** Generic device registration for **school and health** facility devices. A single endpoint (`POST /api/v1/registration`) handles both entity types — the entity type is inferred automatically from whichever Giga ID is present in the request. Writes to the `registration` table. Token issuance uses the **existing** `POST /api/v1/auth/initialize` endpoint — no new token logic is needed.

**Files:**

```
src/registration/
  registration.module.ts
  registration.controller.ts   # POST /api/v1/registration
  registration.service.ts
  registration.dto.ts
  registration.service.spec.ts
  registration.controller.spec.ts
```

**`CreateRegistrationDto`:**

```ts
class CreateRegistrationDto {
  // Exactly one of the two Giga IDs must be present — determines entity type.
  giga_id_school?: string;      // provide for school device registration
  giga_id_health?: string;      // provide for health facility device registration

  country_code: string;         // required — used for whitelist check
  installation_id?: string;     // platform installation ID (machine GUID, Windows install ID, etc.)
  user_id?: string;
  mac_address?: string;
  os?: string;                  // e.g. "Windows"
  app_version?: string;
  network_information?: string; // mirrors registration.network_information (VarChar)
  ip_address?: string;
  device_hardware_id?: string;
  wifi_connections?: object;
}
```

**`RegistrationResponseDto`:**

```ts
class RegistrationResponseDto {
  giga_id: string;              // Giga-assigned UUID of the facility (school or health)
  registration_id: string;      // BigInt → serialised as string; include in all measurement submissions
  entity_type: string;          // "school" or "health" (resolved, not supplied by client)
}
```

**`RegistrationService.createRegistration` flow:**

1. **Validate exclusivity** — exactly one of `giga_id_school` or `giga_id_health` must be non-null. Throw `BadRequestException` if neither or both are present.
2. **Infer entity code** — `giga_id_health` present → `"health"`; otherwise `"school"`.
3. **Resolve `entity_type` row** via `EntityTypeService.getByCode(entityCode)`.
4. **Look up the facility:**
   - Health: query `health` table `WHERE health_id_giga = <giga_id_health> AND deleted IS NULL` — throw `NotFoundException` if not found.
   - School: query `school` table `WHERE giga_id_school = <giga_id_school> AND deleted IS NULL` — throw `NotFoundException` if not found.
5. **Check `country_entity_type_whitelist`** — query `WHERE country_code = <dto.country_code> AND entity_type_id = <resolved id>` — throw `ForbiddenException` if no row exists.
6. **Insert into `registration` table:**
   - `entity_type_id` → resolved id
   - `health_id` / `school_id` → FK to resolved facility row (the other is `null`)
   - `giga_id_health` / `giga_id_school` → populated for the matched entity; `null` for the other
   - `installation_id`, `os`, `app_version`, device fields → from request
   - `is_blocked = false`, `notify = false`
7. Return `RegistrationResponseDto` with `giga_id`, `registration_id` (as string), `entity_type` (name).

---

## 4. Modules to Refactor

### 4.1 `measurement` module — FacilityMeasurements

**Goal:** Add entity-aware measurement endpoints alongside the existing ones. The existing `POST /api/v1/measurements` and `GET /api/v1/measurements` are **not modified** — new v2 routes are added instead, preserving full backward compatibility with zero risk to existing school clients.

| Route | Approach |
|---|---|
| `POST /api/v1/measurements` | Untouched — existing school clients unaffected |
| `GET /api/v1/measurements` | Untouched |
| `GET /api/v1/measurements/v2` | Untouched — existing brief school list |
| `POST /api/v1/measurements/v2` | **New** — entity-aware submission |
| `GET /api/v1/measurements/v2/entity` | **New** — entity-aware list (real version of the `/v2/sandbox` dummy) |

#### 4.1.1 New DTO — `AddMeasurementV2Dto` (`measurement.dto.ts`)

```ts
class AddMeasurementV2Dto {
  // Entity identity — at least one required  // ! RULE
  giga_id_school?: string;
  school_id?: string;          // optional (unlike v1 where school_id was required)
  giga_id_health?: string;

  // Entity type — required for v2
  entity_type: 'school' | 'health';

  // Registration linkage
  registration_id?: bigint;

  // All existing measurement fields (Timestamp, Download, Upload, Latency, etc.)
  Timestamp?: Date;
  Download?: number;
  Upload?: number;
  Latency?: number;
  app_version?: string;
  country_code?: string;
  geolocation?: GeoLocationDto;
  // … all other fields from MeasurementDto
}
```

**Validation constraint:** `@ValidateIf` or custom pipe enforcing that at least one of `giga_id_school` / `giga_id_health` is non-null.

#### 4.1.2 New DTO — `MeasurementV2EntityDto` (`measurement.dto.ts`)

Extends `MeasurementV2Dto` (the existing brief response shape) with entity fields:

```ts
class MeasurementV2EntityDto extends MeasurementV2Dto {
  school_id: string | null;       // null for health measurements
  entity_type: string;            // resolved name from entity_type.name — "school" or "health"
  giga_id_health: string | null;  // null for school measurements
  registration_id: string | null; // BigInt serialised as string; null if not set
}
```

#### 4.1.3 New service method — `MeasurementService`

Add `createMeasurementV2(dto: AddMeasurementV2Dto)`:

1. Resolve `entity_type_id` via `EntityTypeService.getByCode(dto.entity_type)`.
2. If `entity_type === 'health'`:
   - Validate `giga_id_health` resolves to an active `health` row.
   - Check `registration.is_blocked` if `registration_id` provided — reject if true.
   - Persist with `giga_id_health` set, `school_id` / `giga_id_school` null.
   - Use `FacilityGeolocationUtility.calculateDistanceAndSetFlagForFacility('health', …)`.
3. If `entity_type === 'school'`:
   - Same validation as existing `createMeasurement` but school_id is now optional.
   - Use existing `GeolocationUtility.calculateDistanceAndSetFlag`.

Add `measurementsV2Entity(...)` for the GET list:
- Mirrors existing `measurementsV2` with additional `entity_type` and `giga_id_health` filter params.
- Includes `entity_type: { select: { name: true } }` in the Prisma `include` so the name can be serialised.
- Serialises `registration_id` BigInt → string before returning.

#### 4.1.4 New controller routes — `MeasurementController`

```ts
@Post('v2')
async createMeasurementV2(@Body() dto: AddMeasurementV2Dto) { … }

@Get('v2/entity')
async getMeasurementsV2Entity(@Query() query: MeasurementV2EntityQueryDto) { … }
```

Both sit alongside the existing handlers in `measurement.controller.ts` with no conflicts.

---

### 4.2 `nearest-school` → `nearest-facility` — NearestFacility

**Goal:** Find the nearest registered facility (school or health) within a configurable radius.

#### 4.2.1 New `nearest-facility` module

**Location:** `src/nearest-facility/`

```
src/nearest-facility/
  nearest-facility.module.ts
  nearest-facility.controller.ts    # POST /api/v1/nearest-facility
  nearest-facility.service.ts
  nearest-facility.dto.ts
  nearest-facility.service.spec.ts
  nearest-facility.controller.spec.ts
```

**`FindNearestFacilityDto`:**

```ts
class FindNearestFacilityDto {
  latitude: number;
  longitude: number;
  entity_type: 'school' | 'health';   // required — caller decides which table to search
}
```

**`NearestFacilityResponseDto`:**

```ts
class NearestFacilityResponseDto {
  id: string;
  name: string;
  giga_id: string;           // giga_id_school or health_id_giga depending on entity_type
  entity_type: string;
  latitude: number;
  longitude: number;
  country_code: string;
  distance_meters: number;
  address?: string;          // populated for schools; null for health facilities
}
```

**`NearestFacilityService.findNearest` PostGIS logic:**

```ts
if (entity_type === 'school') {
  // identical ST_DWithin query to existing NearestSchoolService
  // searches `school` table where geopoint IS NOT NULL AND deleted IS NULL
} else {
  // searches `health` table — plain Float lat/lon, NO geopoint column
  // must build geography inline:
  // ST_SetSRID(ST_MakePoint(h.longitude, h.latitude), 4326)::geography
}
```

> **Why inline geometry for health?** The `health` model stores `latitude` and `longitude` as plain
> `Float` columns, not a PostGIS `geopoint` geography column. Every `ST_DWithin` / `ST_Distance`
> call must build the point from those two columns inline. Consider adding a generated geography
> column in V2 for query efficiency (see Open Items §9 #2).

**Max distance:** `NEAREST_FACILITY_MAX_DISTANCE_METERS` env var (falls back to `NEAREST_SCHOOL_MAX_DISTANCE_METERS` for school entity type).

#### 4.2.2 Keep `nearest-school` module intact

`NearestSchoolService` and `POST /api/v1/nearest-school` are left unchanged. They remain self-contained — `NearestFacilityService` duplicates the school PostGIS query rather than calling into `NearestSchoolService`, keeping separation clean.

---

### 4.3 `geolocation` module — FacilityGeolocationUtility

**Goal:** Make `GeolocationUtility` entity-agnostic so `MeasurementService` can compute distance-flagging for both school and health measurements.

#### Changes to `geolocation.utility.ts`

Add method:

```ts
async getFacilityCoordinates(
  entity_type: 'school' | 'health',
  giga_id: string,
): Promise<{ latitude: number; longitude: number } | null>
```

```ts
if (entity_type === 'school') {
  return this.getSchoolCoordinates(giga_id);          // existing — no change
} else {
  // health table has plain Float columns, not geopoint
  const result = await this.prisma.health.findFirst({
    where: { health_id_giga: giga_id, deleted: null },
    select: { latitude: true, longitude: true },
  });
  return result ?? null;
}
```

Add method:

```ts
async calculateDistanceAndSetFlagForFacility(
  entity_type: 'school' | 'health',
  giga_id: string,
  deviceLocation: { lat: number; lng: number },
  deviceAccuracy: number,
): Promise<{ distance: number | null; accuracy: number | null; isFlagged: boolean | null }>
```

Delegates to `getFacilityCoordinates` then calls the existing `calculateDistance`. This replaces the direct `calculateDistanceAndSetFlag` call in `MeasurementService` for the health path.

**No breaking change:** The existing `getSchoolCoordinates` and `calculateDistanceAndSetFlag` methods remain intact.

---

### 4.4 `auth` module — no changes required for V1

`AuthGuard` is already entity-agnostic:

- **Bearer tokens** are validated via an external API call — entity type is irrelevant.
- **Device tokens** are validated by `DeviceTokenService` which decrypts an AES-256-GCM token and checks expiry with **no database lookup**. The `deviceId` in the token payload is a hashed platform identifier, not tied to a school or health entity.

Devices obtain a `Device` token by calling the existing `POST /api/v1/auth/initialize` with their `deviceId` (e.g., Windows machine GUID, Chrome extension UUID). No changes to token issuance or validation are required.

**`is_blocked` enforcement:** Because auth is stateless, blocked device checking must happen in `MeasurementService.createMeasurement` by querying `registration.is_blocked` when a `registration_id` is present in the payload.

---

### 4.5 `school-registration` — no changes for V1

`SchoolRegistrationService` operates the **school facility approval workflow** (new school applications → verification → `giga_id_school` assignment). It writes to `school_new_registration`, which is a separate concern from device registration. No changes in V1.

Note: Mirroring approved school registrations into the new `registration` table is a V2 concern, dependent on the `dailycheckapp_school` → `registration` data migration completing first.

---

## 5. Backward-Compatible Adapter Controllers

### 5.1 School measurements

The existing `MeasurementController` at `api/v1/measurements` **is unchanged**. All new DTO fields are `@IsOptional()` — school clients omitting `entity_type` and `giga_id_health` hit the default school path identically to today.

### 5.2 `nearest-school`

Keep `src/nearest-school/nearest-school.controller.ts` as-is. Route `POST /api/v1/nearest-school` preserved.

### 5.3 School registration

`POST /api/v1/school-registration` continues hitting `SchoolRegistrationService` → `school_new_registration`. Unchanged.

### 5.4 Route summary

| Route | Handler | Status | Auth | Notes |
|---|---|---|---|---|
| `POST /api/v1/measurements` | `MeasurementController` | Existing | Device token | Untouched — school clients unchanged |
| `GET /api/v1/measurements` | `MeasurementController` | Existing | Bearer | Untouched |
| `GET /api/v1/measurements/v2` | `MeasurementController` | Existing | Bearer | Untouched brief school list |
| `POST /api/v1/measurements/v2` | `MeasurementController` | New | Device token | Entity-aware submission — school and health |
| `GET /api/v1/measurements/v2/entity` | `MeasurementController` | New | Bearer | Entity-aware list; real replacement for `/v2/sandbox` |
| `POST /api/v1/nearest-school` | `NearestSchoolController` | Existing | Public | School only — preserved as-is |
| `POST /api/v1/nearest-facility` | `NearestFacilityController` | New | Public | School or health via `entity_type` field |
| `POST /api/v1/school-registration` | `SchoolRegistrationController` | Existing | Public | School facility approval workflow |
| `POST /api/v1/registration` | `RegistrationController` | New | Public | Generic device registration — school or health, inferred from supplied Giga ID |
| `GET /api/v1/health` | `HealthController` | New | Bearer | Health facility list |
| `GET /api/v1/health/:id` | `HealthController` | New | Bearer | Health facility by internal `id` |
| `GET /api/v1/health/giga-id/:giga_id` | `HealthController` | New | Bearer | Health facility by `health_id_giga` |
| `POST /api/v1/auth/initialize` | `DeviceTokenController` | Existing | Public | Stateless token issuance — works for school and health devices |

---

### 5.5 Route payload & response examples

---

#### `POST /api/v1/auth/initialize`
*Obtain a Device token before any measurement or registration call.*

**Request body**
```json
{
  "deviceId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response `200 OK`**
```json
{
  "token": "base64EncodedEncryptedToken==",
  "expiresAt": 1705247611000,
  "expiresIn": 180000,
  "issuedAt": 1705247431000,
  "deviceId": "a3f1b8c2d4e6...sha256hash",
  "success": true,
  "message": "Token generated successfully"
}
```

---

#### `POST /api/v1/registration` (New)
*Generic device registration — one endpoint for school and health devices. Provide exactly one Giga ID; the entity type is inferred automatically.*

**Request body — health facility device**
```json
{
  "giga_id_health": "hf-a1b2c3d4-5e6f-7890-abcd-ef1234567890",
  "country_code": "KE",
  "installation_id": "{B4F1A2C3-5D6E-7890-ABCD-EF1234567890}",
  "user_id": "usr-optional-id",
  "os": "Windows",
  "app_version": "1.2.3",
  "mac_address": "AA:BB:CC:DD:EE:FF",
  "device_hardware_id": "hw-fingerprint-abc123",
  "ip_address": "196.201.214.100",
  "network_information": "Ethernet:OfficeNetwork",
  "wifi_connections": [{ "ssid": "OfficeWifi", "strength": -55 }]
}
```

**Request body — school device**
```json
{
  "giga_id_school": "2abb47dd-3fca-44b1-b6c8-0ec0c863c236",
  "country_code": "KE",
  "installation_id": "{C5E2B3D4-6F7A-8901-BCDE-F12345678901}",
  "user_id": "usr-optional-id",
  "os": "Windows",
  "app_version": "1.2.3",
  "mac_address": "11:22:33:44:55:66",
  "device_hardware_id": "hw-fingerprint-def456",
  "ip_address": "196.201.214.101",
  "network_information": "WiFi:SchoolNetwork",
  "wifi_connections": [{ "ssid": "SchoolWifi", "strength": -70 }]
}
```

**Response `201 Created`**
```json
{
  "giga_id": "hf-a1b2c3d4-5e6f-7890-abcd-ef1234567890",
  "registration_id": "987654",
  "entity_type": "health"
}
```

> `giga_id` is the Giga-assigned UUID of whichever facility was registered.
> `registration_id` is a **string** (BigInt serialised for JSON safety).

**Error responses**

| Status | Condition |
|---|---|
| `404 Not Found` | `giga_id_health` does not match any active `health` row |
| `403 Forbidden` | Health entity type not whitelisted for `country_code` in `country_entity_type_whitelist` |

---

#### `POST /api/v1/measurements/v2` — health path (New)
*Submit a measurement from a health facility device. `Device <token>` header required.*

**Request body**
```json
{
  "giga_id_health": "hf-a1b2c3d4-5e6f-7890-abcd-ef1234567890",
  "registration_id": 987654,
  "entity_type": "health",
  "Timestamp": "2024-01-14T15:13:30.824Z",
  "Download": 45.2,
  "Upload": 12.8,
  "Latency": 23,
  "app_version": "1.2.3",
  "country_code": "KE",
  "geolocation": { "location": { "lat": -1.2921, "lng": 36.8219 }, "accuracy": 18.5 }
}
```

**Response `201 Created`**
```json
{
  "success": true,
  "data": { "user_id": "generated-uuid-v4" },
  "timestamp": "2024-01-14T15:13:31.000Z",
  "message": "success"
}
```

**Error responses**

| Status | Condition |
|---|---|
| `400 Bad Request` | Both `giga_id_school` and `giga_id_health` are absent |
| `400 Bad Request` | `giga_id_health` does not resolve to an active `health` row |
| `400 Bad Request` | `registration.is_blocked = true` for the given `registration_id` |

---

#### `POST /api/v1/measurements` — school path (Existing, unchanged)
*Existing school clients — no changes required.*

**Request body**
```json
{
  "school_id": "1234567",
  "giga_id_school": "2abb47dd-3fca-44b1-b6c8-0ec0c863c236",
  "Timestamp": "2024-01-14T15:13:30.824Z",
  "Download": 45.2,
  "Upload": 12.8,
  "Latency": 23,
  "app_version": "1.0.9",
  "country_code": "KEN"
}
```

**Response `201 Created`**
```json
{
  "success": true,
  "data": { "user_id": "generated-uuid-v4" },
  "timestamp": "2024-01-14T15:13:31.000Z",
  "message": "success"
}
```

---

#### `GET /api/v1/measurements/v2/entity` (New)
*Bearer token required. Real replacement for the `/v2/sandbox` dummy. Returns a plain array (no wrapper), matching existing `/v2` convention.*

**Serialisation decisions (apply to all measurement GET endpoints):**
- `entity_type` in the response must be the **string name** (`"school"` / `"health"`) resolved from `entity_type.name`, not the raw numeric `entity_type_id`.
- `entity_type` as a **query filter** accepts the string name and resolves to `entity_type_id` internally before querying.
- `school_id` and `giga_id_school` are returned as `null` (not omitted) for health measurements.
- `registration_id` is serialised as a **string** in JSON responses (BigInt safety).

**Query params**

| Param | Type | Description |
|---|---|---|
| `entity_type` | `"school" \| "health"` | Filter by entity type name |
| `giga_id_health` | `string` | Filter by health facility Giga ID |
| `filterBy` | `string` | Column to filter (`timestamp`, `created_at`) |
| `filterCondition` | `string` | Operator: `lt`, `lte`, `gt`, `gte`, `eq` |
| `filterValue` | `string` (ISO 8601) | Value to compare against |
| `orderBy` | `string` | Sort column; prefix `-` for DESC |
| `size` | `number` | Max results (max `1000`) |
| `page` | `number` | Zero-based page offset |

**Example request**
```
GET /api/v1/measurements/v2/entity?entity_type=health&filterBy=timestamp&filterCondition=gt&filterValue=2026-04-15T00:00:00.000Z&orderBy=timestamp&size=1000
Authorization: Bearer <api-key>
```

**Response `200 OK`** — plain array
```json
[
  {
    "timestamp":         "2026-04-15T08:42:11.000Z",
    "browserId":         "fixture-166a7f2d",
    "download":          337,
    "upload":            173,
    "latency":           41,
    "entity_type":       "health",
    "school_id":         null,
    "giga_id_school":    null,
    "giga_id_health":    "166a7f2d-b341-3762-ac7f-77b02745cf81",
    "registration_id":   "1001",
    "country_code":      "UZ",
    "ip_address":        "10.2.1.2",
    "app_version":       "1.2.3",
    "source":            "DailyCheckApp",
    "created_at":        "2026-04-15T08:43:11.000Z",
    "device_hardware_id":"hw-166a7f2d-b34"
  }
]
```

---

#### `POST /api/v1/nearest-facility` (New)

**Request body**
```json
{
  "latitude": -1.2921,
  "longitude": 36.8219,
  "entity_type": "health"
}
```

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "id": "4001",
    "name": "Nairobi Level 4 Health Centre",
    "giga_id": "hf-a1b2c3d4-5e6f-7890-abcd-ef1234567890",
    "entity_type": "health",
    "latitude": -1.2918,
    "longitude": 36.8217,
    "country_code": "KE",
    "distance_meters": 38.72
  },
  "timestamp": "2024-01-14T15:13:32.000Z",
  "message": "success"
}
```

**Error responses**

| Status | Condition |
|---|---|
| `404 Not Found` | No health facility within `NEAREST_FACILITY_MAX_DISTANCE_METERS` of the coordinates |
| `400 Bad Request` | `entity_type` is absent or not one of `school` / `health` |

---

#### `POST /api/v1/nearest-school` (Existing, unchanged)

**Request body**
```json
{
  "latitude": -1.2921,
  "longitude": 36.8219
}
```

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "id": "1001",
    "name": "Nairobi Primary School",
    "giga_id_school": "2abb47dd-3fca-44b1-b6c8-0ec0c863c236",
    "address": "123 Kenyatta Ave, Nairobi",
    "country_code": "KE",
    "external_id": "KE-SCH-001",
    "latitude": -1.2919,
    "longitude": 36.8220,
    "distance_meters": 24.18
  },
  "timestamp": "2024-01-14T15:13:32.000Z",
  "message": "success"
}
```

---

#### `POST /api/v1/school-registration` (Existing, unchanged)
*School facility approval workflow — not device registration.*

**Request body**
```json
{
  "school_id": "KE-SCH-NEW-001",
  "school_name": "Kisumu Community School",
  "country_iso3_code": "KEN",
  "latitude": -0.0917,
  "longitude": 34.7679,
  "address": { "street": "45 Oginga Odinga St", "city": "Kisumu" },
  "education_level": "Primary",
  "contact_name": "Jane Achieng",
  "contact_email": "jane@kisumu-school.ke"
}
```

**Response `201 Created`**
```json
{
  "giga_id_school": "f9c3e2d1-1234-5678-abcd-0987654321ef",
  "verification_status": "PENDING"
}
```

---

#### `GET /api/v1/health` (New)
*Bearer token required. Country scoping applies.*

**Query params**

| Param | Type | Description |
|---|---|---|
| `country_code` | `string` | Filter by country code (e.g. `KE`) |
| `page` | `number` | Zero-based page offset (default `0`) |
| `size` | `number` | Results per page, max 100 (default `10`) |
| `orderBy` | `string` | Column to sort by; prefix `-` for DESC |

**Response `200 OK`**
```json
{
  "success": true,
  "data": [
    {
      "id": "4001",
      "health_id_giga": "hf-a1b2c3d4-5e6f-7890-abcd-ef1234567890",
      "facility_name": "Nairobi Level 4 Health Centre",
      "facility_level": "Level 4",
      "facility_type_govt": "Dispensary",
      "latitude": -1.2918,
      "longitude": 36.8217,
      "country_code": "KE",
      "admin1": "Nairobi",
      "admin2": "Westlands",
      "is_facility_open": true,
      "connectivity": "Yes",
      "electricity_availability": "Yes"
    }
  ],
  "timestamp": "2024-01-14T15:13:32.000Z",
  "message": "success"
}
```

---

#### `GET /api/v1/health/giga-id/:giga_id` (New)

**Response `200 OK`** — same shape as list but single object in `data`

```json
{
  "success": true,
  "data": {
    "id": "4001",
    "health_id_giga": "hf-a1b2c3d4-5e6f-7890-abcd-ef1234567890",
    "facility_name": "Nairobi Level 4 Health Centre",
    "facility_level": "Level 4",
    "facility_type_govt": "Dispensary",
    "latitude": -1.2918,
    "longitude": 36.8217,
    "country_code": "KE",
    "admin1": "Nairobi",
    "admin2": "Westlands",
    "dhis2_id": "DHIS2-KE-40001",
    "is_facility_open": true,
    "connectivity": "Yes",
    "electricity_availability": "Yes",
    "num_staff": 12,
    "pop_within_5km": 34200
  },
  "timestamp": "2024-01-14T15:13:32.000Z",
  "message": "success"
}
```

**Error responses**

| Status | Condition |
|---|---|
| `404 Not Found` | No active facility matches the given `giga_id` |

---

## 6. Entity Lifecycle Flows

Two parallel lifecycles exist: the **data pipeline** (how a facility enters the system from the data team) and **device registration** (how an app install associates itself with a facility). Both must complete before measurements can be accepted.

### 6.1 School — Data Pipeline (unchanged)

The existing master sync pipeline is unmodified in V1.

1. **`master_sync_intermediate`** — raw inbound record inserted by sync script. `school_id_giga`, `school_name`, `country_id`, `status = "pending"` set.
2. Sync job validates → `status` → `"approved"` or `"rejected"`.
3. **`school`** — upserted on approval with all attribute columns.
4. **`master_sync_school_static`** — new versioned snapshot inserted; `version` incremented.
5. **`school.last_school_static_id`** — updated to point to the new snapshot.

### 6.2 School — Device Registration (new path)

All new school device registrations write to `registration`, not `dailycheckapp_school`. `dailycheckapp_school` receives no new writes.

1. **Whitelist check:** `country_entity_type_whitelist WHERE country_code = ? AND entity_type_id = <school>` — reject if no row.
2. **`entity_type`** read: resolve `id` for `code = "school"`.
3. **`registration`** INSERT:
   - `entity_type_id` → school entity type id
   - `school_id` → FK to `school.id`
   - `giga_id_school` → copied from `school.giga_id_school`
   - `health_id` = null, `giga_id_health` = null
   - `installation_id` → platform-aware (Windows machine GUID, Chrome extension UUID, etc.)
   - Device fields from request payload.
   - `is_blocked = false`, `is_active = true`, `notify = false`

### 6.3 School — Measurement Submission

1. **`registration`** read: look up device's registration row by `registration_id` from request.
2. **`measurements`** INSERT:
   - `registration_id`, `entity_type_id`, `giga_id_school` set from registration row.
   - `giga_id_health` = null, `school_id` = legacy string from payload (nullable).
   - Speed/network fields from test results.
3. **`connectivity_ping_checks`** INSERT (same pattern for ping events).

### 6.4 Health — Data Pipeline (new)

Mirrors the school pipeline using health-specific tables.

1. **`master_sync_intermediate_health`** — raw inbound record inserted. `health_id_giga`, `facility_name`, `country_id`, `status = "pending"` set. Fields like `connectivity`, `is_facility_open` stored as raw strings (e.g. `"Yes"`, `"No"`) — parsed to booleans only on promotion.
2. Sync job validates → `status` → `"approved"` or `"rejected"`.
3. **`health`** — upserted on approval. `signature` computed from core attribute fields.
4. **`master_sync_health_static`** — new versioned snapshot inserted; `health_id` FK set; `version` incremented.
5. **`health.last_health_static_id`** — updated to point to the new snapshot (three-step protocol to handle circular FK; see migration doc §3 model comments).

### 6.5 Health — Device Registration (new)

1. **Whitelist check:** `country_entity_type_whitelist WHERE country_code = ? AND entity_type_id = <health>` — reject (`ForbiddenException`) if no row.
2. **`entity_type`** read: resolve `id` for `code = "health"`.
3. Look up `health` row by `giga_id_health` where `deleted IS NULL` — reject (`NotFoundException`) if not found.
4. **`registration`** INSERT:
   - `entity_type_id` → health entity type id
   - `health_id` → FK to `health.id`
   - `giga_id_health` → copied from `health.health_id_giga`
   - `school_id` = null, `giga_id_school` = null
   - `installation_id`, device fields from request payload.
   - `is_blocked = false`, `is_active = true`, `notify = false`
5. Return `registration.id` to caller so it can be included in subsequent measurement payloads.

### 6.6 Health — Measurement Submission (new)

1. **`registration`** read: look up device's registration row by `registration_id` from request. Check `is_blocked` — reject if true.
2. Validate `giga_id_health` resolves to an active `health` row.
3. **`measurements`** INSERT:
   - `registration_id`, `entity_type_id`, `giga_id_health` set from registration row.
   - `giga_id_school` = null, `school_id` = null.
   - Speed/network fields from test results.
4. **`connectivity_ping_checks`** INSERT (same pattern). At least one of `giga_id_school` or `giga_id_health` must be non-null — enforced by validation before insert.

### 6.7 Tables touched — summary

| Step | Table | Operation | School | Health |
|---|---|---|---|---|
| Data pipeline — staging | `master_sync_intermediate` / `master_sync_intermediate_health` | INSERT | ✓ | ✓ |
| Data pipeline — validate | (same tables) | UPDATE `status` | ✓ | ✓ |
| Data pipeline — entity row | `school` / `health` | UPSERT | ✓ | ✓ |
| Data pipeline — snapshot | `master_sync_school_static` / `master_sync_health_static` | INSERT | ✓ | ✓ |
| Data pipeline — pointer update | `school.last_school_static_id` / `health.last_health_static_id` | UPDATE | ✓ | ✓ |
| Registration — whitelist check | `country_entity_type_whitelist` | READ | ✓ | ✓ |
| Registration — type lookup | `entity_type` | READ | ✓ | ✓ |
| Registration — device row | `registration` | INSERT | ✓ (new path) | ✓ |
| Registration — legacy reads | `dailycheckapp_school` | READ only | ✓ | — |
| Measurement | `measurements` | INSERT | ✓ | ✓ |
| Ping check | `connectivity_ping_checks` | INSERT | ✓ | ✓ |
| Token issuance | `POST /api/v1/auth/initialize` (stateless) | — | ✓ | ✓ |

---

## 7. Testing Strategy

### 7.1 Unit tests

Each new service gets a `.spec.ts` that mocks `PrismaService` and `EntityTypeService`.

| File | Key scenarios |
|---|---|
| `entity-type.service.spec.ts` | Correct row returned for `school`/`health`; throws on unknown code; caches after first DB call |
| `health.service.spec.ts` | `findAll` respects country scoping; `findByGigaId` throws `NotFoundException` for unknown id; `getCoordinates` returns null for unknown facility |
| `registration.service.spec.ts` | Rejects when both or neither Giga IDs provided (400); rejects unknown `giga_id_health` / `giga_id_school` (404); rejects non-whitelisted country (403); creates `registration` row with correct `entity_type_id`, `health_id`/`school_id`, and null for the other |
| `nearest-facility.service.spec.ts` | Returns nearest school for `entity_type=school`; returns nearest health for `entity_type=health`; `NotFoundException` when none within radius |
| `geolocation.utility.spec.ts` | `getFacilityCoordinates` branches correctly per entity type; returns null for missing facility; `calculateDistanceAndSetFlagForFacility` propagates null when coordinates unavailable |
| `measurement.service.spec.ts` | Health path persists `entity_type_id`+`giga_id_health`, leaves `school_id` null; school default path unchanged; `giga_id_health` filter works in `measurements()`; blocked registration rejected |

### 7.2 Integration tests

Seed the test DB with:
- `entity_type` rows: `{ code:'school' }`, `{ code:'health' }`
- One `health` row with known `health_id_giga` and coordinates
- One `school` row with known `giga_id_school` and `geopoint`
- `country_entity_type_whitelist` rows enabling both entity types for the test country

| Scenario | Assertions |
|---|---|
| `POST /api/v1/registration` — health device, valid `giga_id_health`, whitelisted country | 201; `registration` row has correct `entity_type_id`, `health_id` set, `school_id` null |
| `POST /api/v1/registration` — school device, valid `giga_id_school`, whitelisted country | 201; `registration` row has correct `entity_type_id`, `school_id` set, `health_id` null |
| `POST /api/v1/registration` — both `giga_id_school` and `giga_id_health` provided | 400 |
| `POST /api/v1/registration` — neither Giga ID provided | 400 |
| `POST /api/v1/registration` — unknown `giga_id_health` | 404 |
| `POST /api/v1/registration` — unknown `giga_id_school` | 404 |
| `POST /api/v1/registration` — country not in whitelist | 403 |
| `POST /api/v1/measurements` with `entity_type=health` + `giga_id_health` | 201; row has `giga_id_health` set, `school_id` null |
| `POST /api/v1/measurements` — both `giga_id_school` and `giga_id_health` absent | 400 |
| `GET /api/v1/measurements?giga_id_health=...` | Returns only health measurements for that facility |
| `POST /api/v1/nearest-facility` with `entity_type=health` | Returns health facility within radius |
| `POST /api/v1/nearest-facility` with `entity_type=school` | Returns same result as `POST /api/v1/nearest-school` |
| `POST /api/v1/nearest-school` | Still returns school result — no regression |
| `POST /api/v1/measurements` without `entity_type` (school default) | Still works — no regression |
| Legacy school client with existing school payload | All existing fields work unchanged |

### 7.3 Auth integration

No new auth integration tests needed — `DeviceTokenService` is stateless and already entity-agnostic. Existing device token tests cover the auth path for health entities implicitly.

Test the blocked-device check in `measurement.service.spec.ts` (unit) by mocking a `registration` row where `is_blocked = true`.

---

## 8. Implementation Order

Dependencies flow top-to-bottom. Each phase can be PR'd independently.

```
Phase A — Foundation
  A1. EntityTypeService + module
  A2. HealthService (no controller yet) — reads health table, provides getCoordinates

Phase B — Health data write path
  B1. RegistrationService + Controller (POST /api/v1/registration) — generic school/health
  B2. HealthController GET endpoints (depends on A2)

Phase C — Entity-agnostic service refactors
  C1. GeolocationUtility: add getFacilityCoordinates + calculateDistanceAndSetFlagForFacility
  C2. MeasurementService: health entity path in createMeasurement + giga_id_health filter
  C3. NearestFacilityService + Controller

Phase D — Testing
  D1. Unit tests alongside each phase above
  D2. Integration tests after Phase C
```

---

## 9. Open Items & Decisions

| # | Item | Blocking? | Status |
|---|---|---|---|
| 1 | **`registration.installation_id` type** — what is the final type? UUID? Varchar fingerprint? Platform-specific string (Windows machine GUID / Chrome extension UUID)? Migration SQL and DTO validation both depend on this. | **YES** | Decision needed |
| 2 | **Health table geometry** — `health` stores `latitude`/`longitude` as plain `Float` with no PostGIS `geopoint` column. All spatial queries build the geography inline. Is this intentional for V1, or should a generated geography column be added? Affects `NearestFacilityService` and `GeolocationUtility` performance. | No (V1 OK inline; V2 optimisation) | Decision needed |
| 3 | **`connectivity_ping_checks` entity scope** — the schema adds `entity_type_id`, `registration_id`, `giga_id_health` to this table (matching `measurements`). Should ping checks become entity-agnostic in V1 alongside measurements, or is that deferred? | No | Decision needed |
| 4 | **`dailycheckapp_school` → `registration` data migration** — Python script to copy existing school device registrations and backfill `entity_type_id`. Until this runs, new school device registrations from updated app versions have no legacy fallback. | No (V1 can ship without it; new installs use `registration`) | Out of scope for backend code — separate script |
| 5 | **`country_entity_type_whitelist` seed data** — which countries should be seeded with health entity access for initial rollout? | No (app code independent) | Product decision |
| 6 | **`master_sync_intermediate` / `master_sync_intermediate_health` country FK standardisation** — both currently use `country.id`; migration doc defers standardisation to `country.code` to V2. | No | Deferred to V2 |
| 7 | **`entity_type` seed rows** — must exist before any Phase A code ships. Currently noted as a gap in `health-entity-v1-migration-status.md` §4. | **YES** | Needs seed script or manual SQL |
