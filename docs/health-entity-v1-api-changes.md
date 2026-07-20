# Health Facility API — Changes (V1 backward compat + V2)

> Quick-reference changelog for the health facility rollout.
> For full implementation detail see `health-entity-v1-backend-refactor.md`.
>
> **V2 is the canonical API** for new integrations. V1 endpoints remain available for backward compatibility and use legacy `entity_type` field names in JSON.
>
> **Change markers used inline:**
> ```
> // + NEW    field or param added in V1
> // ~ CHANGED  existing field behaviour changed
> // ! RULE   validation rule enforced at application layer
> ```

---

## V2 endpoints (preferred)

| Method | V2 path | V1 equivalent (deprecated field names) |
|--------|---------|--------------------------------------|
| `POST` | `/api/v2/registration` | `/api/v1/registration` — response uses `facility_type` |
| `POST` | `/api/v2/nearest-facility` | `/api/v1/nearest-facility` — body uses `facility_type` |
| `GET` | `/api/v2/health` | `/api/v1/health` |
| `GET` | `/api/v2/health/giga-id/:giga_id` | `/api/v1/health/giga-id/:giga_id` |
| `POST` | `/api/v2/measurements` | `/api/v1/measurements/v2` — body uses `facility_type` |
| `GET` | `/api/v2/measurements/facility` | `/api/v1/measurements/v2/entity` — query uses `facility_type` |

### Frontend-driven V2 additions (2026-07-16)

Endpoints added for the multi-facility desktop client (see the workspace's
`project-memory/plans/0003-multi-facility-frontend.md`, backend deps B2–B8):

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/api/v2/registration/existing` | Public. Recovers a registration via the priority chain `installation_id → device_hardware_id → giga_id (+ browser_id)`. `200 { registration_id, facility_type, giga_id, is_active, is_blocked }`, `404` if no match. |
| `GET` | `/api/v2/registration/status?installation_id=` | Public. `{ exists, is_active, is_blocked }` (nulls when `exists=false`). |
| `POST` | `/api/v2/registration/deactivate` | Public. Body `{ installation_id?, registration_id? }` (at least one). Sets `is_active=false`. |
| `GET` | `/api/v2/health?govt_id=` | New filter (also on v1): matches `dhis2_id`, `hims_id` or `hfml_id`. Powers the "type an ID" Health lookup. |
| `POST` | `/api/v2/measurements/batch` | Auth. Array body, same record shape as the single POST. Tolerant: per-record errors reported in `data.errors`, valid records still stored. |
| `POST` | `/api/v2/connectivity` | Auth. Body `{ registration_id?, facility_type, giga_id_school?/giga_id_health?, installation_id?, records: [...] }`. `app_local_uuid` duplicates skipped (idempotent retries). |
| `GET` | `/api/v2/countries` | Public, cached. `[ { country_code, name, supported_facility_types } ]` — whitelist-driven; enabling a facility type per country needs no deploy. |
| `GET` | `/api/v2/feature-flags?installation_id=` | Public. Flat `{ flagKey: boolean }`. Works pre-registration (global defaults); context enriched from the registration when the installation is known. |

**Ingest self-heal:** `POST /api/v2/measurements` (single and batch) and
`POST /api/v2/connectivity` resolve the registration server-side via the same
priority chain when `registration_id` is missing (legacy installs whose
reconciliation never ran). Unresolvable records are stored with
`registration_id = null` rather than rejected. `installation_id` is now
accepted on measurement records for this purpose.

**Legacy backfill-on-read (2026-07-17):** v1 registrations live in
`dailycheckapp_school`, not in `registration`. Both `GET
/registration/existing` and the ingest self-heal now fall back to that table
(`device_hardware_id` → `giga_id + user_id` → `giga_id`) and lazily
materialize a v2 `registration` row from the v1 data (school-only,
idempotent, caller's `installation_id` stamped for future lookups). As a last
resort the ingest self-heal lazy-creates a registration from a **valid**
`giga_id_*` (facility must exist in the master table — junk traffic mints
nothing). A 404 from `existing` therefore means "genuinely never registered":
the client sends the user through the normal registration flow.

### Naming: entity → facility

| Layer | Legacy (V1 API) | Current (DB + V2 API) |
|-------|-----------------|------------------------|
| Discriminator table | `entity_type` | `facility_type` |
| FK column | `entity_type_id` | `facility_type_id` |
| Country whitelist | `country_entity_type_whitelist` | `country_facility_type_whitelist` |
| JSON field | `entity_type` | `facility_type` |
| Internal service | `EntityTypeService` | `FacilityTypeService` |

Apply migration `20260624120000_rename_entity_type_to_facility_type` and run `npx prisma generate` after pulling.

---

## Contents

- [V2 endpoints (preferred)](#v2-endpoints-preferred)
- [New V1 Endpoints (backward compat, 6)](#new-endpoints)
  - [POST /api/v1/registration](#post-apiv1registration)
  - [POST /api/v1/nearest-facility](#post-apiv1nearest-facility)
  - [GET /api/v1/health](#get-apiv1health)
  - [GET /api/v1/health/giga\_id/:giga\_id](#get-apiv1healthgiga_idgiga_id)
  - [POST /api/v1/measurements/v2](#post-apiv1measurementsv2)
  - [GET /api/v1/measurements/v2/entity](#get-apiv1measurementsv2entity)
- [Unchanged Endpoints (6)](#unchanged-endpoints)
  - [POST /api/v1/measurements](#post-apiv1measurements)
  - [GET /api/v1/measurements](#get-apiv1measurements)
  - [GET /api/v1/measurements/v2](#get-apiv1measurementsv2)
  - [POST /api/v1/auth/initialize](#post-apiv1authinitialize)
  - [POST /api/v1/nearest-school](#post-apiv1nearest-school)
  - [POST /api/v1/school-registration](#post-apiv1school-registration)
- [End-to-End Testing Flows](#end-to-end-testing-flows)
  - [Flow A — Health facility device](#flow-a--health-facility-device)
  - [Flow B — School device](#flow-b--school-device)
- [Serialisation Rules (all endpoints)](#serialisation-rules-all-endpoints)

---

## New Endpoints (V1 — backward compatibility)

> These routes remain supported. New clients should use the [V2 endpoints](#v2-endpoints-preferred) with `facility_type` naming instead of `entity_type`.

### POST /api/v1/registration

Generic device registration for school **and** health facility devices. Writes a row into the `registration` table and returns a `registration_id` the device must include in all subsequent measurement submissions.

The entity type is inferred automatically from whichever Giga ID is provided — no `entity_type` field is needed in the request.

**Auth:** Public (no token required)

**Entity type resolution**

| Provided field | Inferred `entity_type` | Facility table checked |
|---|---|---|
| `giga_id_school` | `"school"` | `school` |
| `giga_id_health` | `"health"` | `health` |

**Pre-conditions checked before insert:**
- Exactly one of `giga_id_school` or `giga_id_health` must be present → `400` if neither or both
- The provided Giga ID must resolve to an active (non-deleted) facility row → `404` if not found
- `country_code` + resolved entity type must exist in `country_entity_type_whitelist` → `403` if not whitelisted

**Request — health facility device**
```json
POST /api/v1/registration

{
  "giga_id_health":    "hf-a1b2c3d4-5e6f-7890-abcd-ef1234567890",
  "country_code":      "KE",
  "installation_id":   "win-install-id-abc123xyz",
  "user_id":           "usr-optional-id",
  "os":                "Windows",
  "app_version":       "1.2.3",
  "mac_address":       "AA:BB:CC:DD:EE:FF",
  "device_hardware_id":"hw-fingerprint-abc123",
  "ip_address":        "196.201.214.100",
  "network_information":"Ethernet:OfficeNetwork",
  "wifi_connections":  [{ "ssid": "OfficeWifi", "strength": -55 }]
}
```

**Request — school device**
```json
POST /api/v1/registration
{
  "giga_id_school":    "2abb47dd-3fca-44b1-b6c8-0ec0c863c236",
  "country_code":      "KE",
  "installation_id":   "win-install-id-def456uvw",
  "user_id":           "usr-optional-id",
  "os":                "Windows",
  "app_version":       "1.2.3",
  "mac_address":       "11:22:33:44:55:66",
  "device_hardware_id":"hw-fingerprint-def456",
  "ip_address":        "196.201.214.101",
  "network_information":"WiFi:SchoolNetwork",
  "wifi_connections":  [{ "ssid": "SchoolWifi", "strength": -70 }]
}
```

**Response `201 Created`**
```json
{
  "giga_id":         "hf-a1b2c3d4-5e6f-7890-abcd-ef1234567890",
  "registration_id": "987654",
  "entity_type":     "health"
}
```

> `giga_id` is the Giga-assigned UUID of the registered facility (school or health).
> `registration_id` is serialised as a **string** (BigInt in the DB).

**Errors**

| Status | Reason |
|---|---|
| `400 Bad Request` | Neither `giga_id_school` nor `giga_id_health` provided, or both provided |
| `404 Not Found` | Provided Giga ID not found in the corresponding facility table |
| `403 Forbidden` | Entity type not whitelisted for this `country_code` |

---

### POST /api/v1/nearest-facility

Finds the nearest facility (school **or** health) within a configurable radius of the given coordinates. The caller specifies which entity type to search.

- For `entity_type: "school"` — queries the `school` table using the existing PostGIS `geopoint` column (identical logic to `POST /api/v1/nearest-school`).
- For `entity_type: "health"` — queries the `health` table, building geography on the fly from the plain `latitude`/`longitude` Float columns (`ST_MakePoint(longitude, latitude)`).

**Auth:** Public

**Request**
```json
POST /api/v1/nearest-facility

{
  "latitude":    -1.2921,
  "longitude":   36.8219,
  "entity_type": "health"
}
```

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "id":             "4001",
    "name":           "Nairobi Level 4 Health Centre",
    "giga_id":        "hf-a1b2c3d4-5e6f-7890-abcd-ef1234567890",
    "entity_type":    "health",
    "latitude":       -1.2918,
    "longitude":      36.8217,
    "country_code":   "KE",
    "distance_meters": 38.72
  },
  "timestamp": "2024-01-14T15:13:32.000Z",
  "message": "success"
}
```

> `giga_id` is `giga_id_school` for school results, `health_id_giga` for health results.
> `address` is included for school results; omitted for health.

**Errors**

| Status | Reason |
|---|---|
| `404 Not Found` | No facility within the configured max distance |
| `400 Bad Request` | `entity_type` missing or not `"school"` / `"health"` |

---

### GET /api/v1/health

Returns a paginated list of health facility master records, scoped to the caller's allowed countries.

**Auth:** Bearer token

**Query params**

| Param | Type | Default | Description |
|---|---|---|---|
| `country_code` | `string` | — | Filter by country code (e.g. `KE`) |
| `page` | `number` | `0` | Zero-based page offset |
| `size` | `number` | `10` | Results per page (max `100`) |
| `orderBy` | `string` | `facility_name` | Column to sort by; prefix `-` for DESC |

**Example request**
```
GET /api/v1/health?country_code=KE&page=0&size=25&orderBy=-facility_name
Authorization: Bearer <vendor-api-key>
```

**Response `200 OK`**
```json
{
  "success": true,
  "data": [
    {
      "id":                    "4001",
      "health_id_giga":        "hf-a1b2c3d4-5e6f-7890-abcd-ef1234567890",
      "facility_name":         "Nairobi Level 4 Health Centre",
      "facility_level":        "Level 4",
      "facility_type_govt":    "Dispensary",
      "facility_ownership_govt": "Public",
      "latitude":              -1.2918,
      "longitude":             36.8217,
      "country_code":          "KE",
      "admin1":                "Nairobi",
      "admin2":                "Westlands",
      "is_facility_open":      true,
      "connectivity":          "Yes",
      "electricity_availability": "Yes"
    }
  ],
  "timestamp": "2024-01-14T15:13:32.000Z",
  "message": "success"
}
```

---

### GET /api/v1/health/giga\_id/:giga\_id

Returns a single health facility by its Giga-assigned ID (`health_id_giga`). Returns a fuller field set than the list endpoint.

**Auth:** Bearer token

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "id":                    "4001",
    "health_id_giga":        "hf-a1b2c3d4-5e6f-7890-abcd-ef1234567890",
    "facility_name":         "Nairobi Level 4 Health Centre",
    "facility_level":        "Level 4",
    "facility_type_govt":    "Dispensary",
    "facility_ownership_govt": "Public",
    "latitude":              -1.2918,
    "longitude":             36.8217,
    "country_code":          "KE",
    "admin1":                "Nairobi",
    "admin2":                "Westlands",
    "dhis2_id":              "DHIS2-KE-40001",
    "is_facility_open":      true,
    "connectivity":          "Yes",
    "electricity_availability": "Yes",
    "num_staff":             12,
    "pop_within_5km":        34200
  },
  "timestamp": "2024-01-14T15:13:32.000Z",
  "message": "success"
}
```

**Errors**

| Status | Reason |
|---|---|
| `404 Not Found` | No active facility for the given `giga_id` |

---

### POST /api/v1/measurements/v2

Entity-aware measurement submission for health (and school) devices. Sits alongside the existing `POST /api/v1/measurements` which is left untouched. New clients should use this endpoint; existing school clients continue using the v1 route without any changes.

**Auth:** `Device <token>` (obtained from `POST /api/v1/auth/initialize`)

**Validation rule:** at least one of `giga_id_school` or `giga_id_health` must be present. // ! RULE

**Checks run before insert:**
- `giga_id_health` (if provided) must resolve to an active `health` row → `400` if not found
- `registration.is_blocked` must be `false` for the given `registration_id` → `400` if blocked

**Request — health measurement**
```json
POST /api/v1/measurements/v2

{
  "giga_id_health":  "hf-a1b2c3d4-5e6f-7890-abcd-ef1234567890",
  "registration_id": 987654,
  "entity_type":     "health",
  "Timestamp":       "2024-01-14T15:13:30.824Z",
  "Download":        45.2,
  "Upload":          12.8,
  "Latency":         23,
  "app_version":     "1.2.3",
  "country_code":    "KE",
  "geolocation": { "location": { "lat": -1.2921, "lng": 36.8219 }, "accuracy": 18.5 }
}
```

**Request — school measurement**
```json
POST /api/v1/measurements/v2

{
  "giga_id_school":  "2abb47dd-3fca-44b1-b6c8-0ec0c863c236",
  "school_id":       "1234567",
  "entity_type":     "school",
  "Timestamp":       "2024-01-14T15:13:30.824Z",
  "Download":        45.2,
  "Upload":          12.8,
  "Latency":         23,
  "app_version":     "1.2.3",
  "country_code":    "KEN"
}
```

**Response `201 Created`** — same shape as v1
```json
{
  "success":   true,
  "data":      { "user_id": "generated-uuid-v4" },
  "timestamp": "2024-01-14T15:13:31.000Z",
  "message":   "success"
}
```

**Errors**

| Status | Reason |
|---|---|
| `400 Bad Request` | Both `giga_id_school` and `giga_id_health` absent |
| `400 Bad Request` | `giga_id_health` not found in `health` table |
| `400 Bad Request` | `registration.is_blocked = true` for the given `registration_id` |

---

### GET /api/v1/measurements/v2/entity

Entity-aware measurement list. Extends the existing `GET /api/v1/measurements/v2` brief shape with entity fields (`entity_type`, `giga_id_health`, `registration_id`). The existing `GET /api/v1/measurements/v2` is left untouched.


**Auth:** Bearer token

**Query params** — all existing `/v2` params supported, plus:

| Param | Type | Default | Description |
|---|---|---|---|
| `entity_type` | `"school" \| "health"` | — | Filter by entity type name |
| `giga_id_health` | `string` | — | Filter by health facility Giga ID |
| `filterBy` | `string` | — | Column to filter on (`timestamp`, `created_at`) |
| `filterCondition` | `string` | — | Operator: `lt`, `lte`, `gt`, `gte`, `eq` |
| `filterValue` | `string` (ISO 8601) | — | Value to compare against |
| `orderBy` | `string` | `-timestamp` | Column to sort by; prefix `-` for DESC |
| `size` | `number` | `10` | Max results (max `1000`) |
| `page` | `number` | `0` | Zero-based page offset |

**Example request**
```
GET /api/v1/measurements/v2/entity?entity_type=health&filterBy=timestamp&filterCondition=gt&filterValue=2026-04-15T00:00:00.000Z&orderBy=timestamp&size=1000
Authorization: Bearer <vendor-api-key>
```

**Response `200 OK`** — plain array, no wrapper
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
  },
  {
    "timestamp":         "2026-04-15T09:17:43.000Z",
    "browserId":         "fixture-2a8c9f4d",
    "download":          12450,
    "upload":            3210,
    "latency":           67,
    "entity_type":       "health",
    "school_id":         null,
    "giga_id_school":    null,
    "giga_id_health":    "2a8c9f4d-1e22-4b58-9a0c-5d3e8b7f1a92",
    "registration_id":   "1247",
    "country_code":      "ZA",
    "ip_address":        "10.5.4.2",
    "app_version":       "1.2.3",
    "source":            "DailyCheckApp",
    "created_at":        "2026-04-15T09:18:43.000Z",
    "device_hardware_id":"hw-2a8c9f4d-1e2"
  }
]
```

---

## Unchanged Endpoints

The following endpoints have **no changes to their request or response contracts**. Existing clients require no updates.

---

### POST /api/v1/measurements

Submits a single school measurement. School clients continue using this endpoint unchanged.

**Auth:** `Device <token>`

**V1 note:** `POST /api/v1/measurements/v2` is the entity-aware replacement for new clients. This endpoint remains the canonical path for existing school devices.

---

### GET /api/v1/measurements

Returns the full measurement list with all fields. School-scoped by bearer token country access.

**Auth:** Bearer token

**V1 note:** `GET /api/v1/measurements/v2/entity` is the entity-aware replacement that adds `entity_type`, `giga_id_health`, and `registration_id` fields. This endpoint returns only school measurements and is preserved as-is.

---

### GET /api/v1/measurements/v2

Returns a brief (reduced-field) list of school measurements. Plain array, no wrapper object.

**Auth:** Bearer token

**V1 note:** `GET /api/v1/measurements/v2/entity` extends this shape with entity fields (`entity_type`, `giga_id_health`, `registration_id`). This endpoint is preserved untouched.

---

### POST /api/v1/auth/initialize

Stateless AES-256-GCM device token issuance. Returns a short-lived `Device` token the device must pass as `Authorization: Device <token>` on measurement submissions.

**Auth:** Public

**V1 note:** Health facility devices use this same endpoint — no entity-specific variant is needed. Token issuance is fully entity-agnostic.

**Request**
```json
POST /api/v1/auth/initialize

{
  "deviceId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response `200 OK`**
```json
{
  "token":     "base64EncodedEncryptedToken==",
  "expiresAt": 1705247611000,
  "expiresIn": 180000,
  "issuedAt":  1705247431000,
  "deviceId":  "a3f1b8c2d4e6...sha256hash",
  "success":   true,
  "message":   "Token generated successfully"
}
```

---

### POST /api/v1/nearest-school

Finds the nearest school within the configured radius of the provided coordinates.

**Auth:** Public

**V1 note:** Preserved as-is for backward compatibility. `POST /api/v1/nearest-facility` with `entity_type: "school"` is the entity-agnostic equivalent for new clients.

**Request**
```json
POST /api/v1/nearest-school

{
  "latitude":  -1.2921,
  "longitude": 36.8219
}
```

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "id":             "1234",
    "name":           "Westlands Primary",
    "giga_id_school": "2abb47dd-3fca-44b1-b6c8-0ec0c863c236",
    "address":        "Westlands Rd, Nairobi",
    "country_code":   "KE",
    "external_id":    "KE-12345",
    "latitude":       -1.2918,
    "longitude":      36.8217,
    "distance_meters": 38.72
  },
  "timestamp": "2024-01-14T15:13:32.000Z",
  "message":   "success"
}
```

**Errors**

| Status | Reason |
|---|---|
| `404 Not Found` | No school within configured max distance |

---

### POST /api/v1/school-registration

School facility approval workflow. Submits a new school for review; writes to the `school_new_registration` table and dispatches a verification request.

**Auth:** Public

**V1 note:** This endpoint handles the school-facility onboarding pipeline (approval, verification). It is entirely separate from device registration (`POST /api/v1/registration`) and is unchanged.

---

## End-to-End Testing Flows

Complete request sequences using the seed data from `src/prisma/scripts/seed-health-entity-v1.sql`.
Replace `<token>` and `<api-key>` with real values from your environment.

---

### Flow A — Health facility device

#### Step 1 · Get a Device token
```bash
curl -s -X POST http://localhost:3000/api/v1/auth/initialize \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "550e8400-e29b-41d4-a716-446655440000"
  }'
```
```json
{
  "token": "<device-token>",
  "expiresAt": 1705247611000,
  "expiresIn": 180000,
  "issuedAt": 1705247431000,
  "success": true
}
```

#### Step 2 · Register the health facility device
```bash
curl -s -X POST http://localhost:3000/api/v1/registration \
  -H "Content-Type: application/json" \
  -d '{
    "giga_id_health":     "hf-a1b2c3d4-5e6f-7890-abcd-ef1234567890",
    "country_code":       "KE",
    "installation_id":    "win-install-id-abc123xyz",
    "os":                 "Windows",
    "app_version":        "1.2.3",
    "mac_address":        "AA:BB:CC:DD:EE:FF",
    "device_hardware_id": "hw-fingerprint-abc123",
    "ip_address":         "196.201.214.100",
    "network_information":"Ethernet:OfficeNetwork",
    "wifi_connections":   [{ "ssid": "OfficeWifi", "strength": -55 }]
  }'
```
```json
{
  "giga_id":         "hf-a1b2c3d4-5e6f-7890-abcd-ef1234567890",
  "registration_id": "987654",
  "entity_type":     "health"
}
```

> `registration_id` is returned as a string. Pass the numeric value `987654` in measurement submissions.

#### Step 3 · Submit a health measurement
```bash
curl -s -X POST http://localhost:3000/api/v1/measurements/v2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Device <device-token>" \
  -d '{
    "giga_id_health":  "hf-a1b2c3d4-5e6f-7890-abcd-ef1234567890",
    "registration_id": 987654,
    "entity_type":     "health",
    "Timestamp":       "2024-01-14T15:13:30.824Z",
    "Download":        45.2,
    "Upload":          12.8,
    "Latency":         23,
    "app_version":     "1.2.3",
    "country_code":    "KE",
    "geolocation": {
      "location": { "lat": -1.2921, "lng": 36.8219 },
      "accuracy": 18.5
    }
  }'
```
```json
{
  "success":   true,
  "data":      { "user_id": "<generated-uuid>" },
  "timestamp": "2024-01-14T15:13:31.000Z",
  "message":   "success"
}
```

#### Step 4 · Query the submitted measurement
```bash
curl -s "http://localhost:3000/api/v1/measurements/v2/entity?entity_type=health&size=10" \
  -H "Authorization: Bearer <api-key>"
```
```json
[
  {
    "timestamp":         "2024-01-14T15:13:30.824Z",
    "browserId":         null,
    "download":          45.2,
    "upload":            12.8,
    "latency":           23,
    "entity_type":       "health",
    "school_id":         null,
    "giga_id_school":    null,
    "giga_id_health":    "hf-a1b2c3d4-5e6f-7890-abcd-ef1234567890",
    "registration_id":   "987654",
    "country_code":      "KE",
    "app_version":       "1.2.3",
    "source":            "DailyCheckApp"
  }
]
```

---

### Flow B — School device

#### Step 1 · Get a Device token
Same as Flow A Step 1.

#### Step 2 · Register the school device
```bash
curl -s -X POST http://localhost:3000/api/v1/registration \
  -H "Content-Type: application/json" \
  -d '{
    "giga_id_school":     "2abb47dd-3fca-44b1-b6c8-0ec0c863c236",
    "country_code":       "KE",
    "installation_id":    "win-install-id-def456uvw",
    "os":                 "Windows",
    "app_version":        "1.2.3",
    "mac_address":        "11:22:33:44:55:66",
    "device_hardware_id": "hw-fingerprint-def456",
    "ip_address":         "196.201.214.101",
    "network_information":"WiFi:SchoolNetwork",
    "wifi_connections":   [{ "ssid": "SchoolWifi", "strength": -70 }]
  }'
```
```json
{
  "giga_id":         "2abb47dd-3fca-44b1-b6c8-0ec0c863c236",
  "registration_id": "<new-id>",
  "entity_type":     "school"
}
```

#### Step 3 · Submit a school measurement
```bash
curl -s -X POST http://localhost:3000/api/v1/measurements/v2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Device <device-token>" \
  -d '{
    "giga_id_school": "2abb47dd-3fca-44b1-b6c8-0ec0c863c236",
    "school_id":      "1234567",
    "entity_type":    "school",
    "Timestamp":      "2024-01-14T15:13:30.824Z",
    "Download":       45.2,
    "Upload":         12.8,
    "Latency":        23,
    "app_version":    "1.2.3",
    "country_code":   "KEN"
  }'
```
```json
{
  "success":   true,
  "data":      { "user_id": "<generated-uuid>" },
  "timestamp": "2024-01-14T15:13:31.000Z",
  "message":   "success"
}
```

---

### Common error responses

| Scenario | Request | Expected |
|---|---|---|
| Both IDs provided | `giga_id_school` + `giga_id_health` in body | `400` |
| Neither ID provided | body with only `country_code` | `400` |
| Unknown Giga ID | `giga_id_health: "does-not-exist"` | `404` |
| Country not whitelisted | `country_code: "NG"` (not in whitelist) | `403` |
| Blocked registration | `registration_id` where `is_blocked=true` | `400` |

---

## Serialisation Rules (all endpoints)

These rules apply consistently across every endpoint that reads from or writes to `measurements`, `connectivity_ping_checks`, or the `registration` table.

| Field | Rule |
|---|---|
| `entity_type` (response) | Always the **string name** from `entity_type.name` — `"school"` or `"health"`. Never the raw numeric `entity_type_id`. |
| `entity_type` (query filter) | Accepts the string name; resolved to `entity_type_id` internally before querying. |
| `registration_id` (response) | Serialised as a **string** — it is a `BigInt` in the DB and would overflow JSON number precision. |
| `school_id` / `giga_id_school` | Present and populated for school measurements; `null` (not omitted) for health measurements. |
| `giga_id_health` | Present and populated for health measurements; `null` (not omitted) for school measurements. |
| At least one entity ID | `giga_id_school` or `giga_id_health` must be non-null on every measurement and ping-check write. Enforced at the application layer. |

---

## Testing and seed data

All new endpoints require seed data before manual or integration testing.
Run the idempotent seed script after migrations:

```bash
psql $DATABASE_URL -f src/prisma/scripts/seed-health-entity-v1.sql
```

This populates `entity_type`, `health`, `country_entity_type_whitelist`, and
related fixture rows used in the examples above.

For the full PR test plan (setup checklist, unit tests, and curl smoke tests),
see `docs/health-entity-v1-testing-guide.md` → **Pull request test plan**.
