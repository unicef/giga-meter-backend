# Health Entity V1 — Testing Guide

Step-by-step instructions for seeding the local database and testing every new
endpoint introduced in the Health Entity V1 rollout.

> **Related docs**
> - API contract: `health-entity-v1-api-changes.md`
> - Implementation detail: `health-entity-v1-backend-refactor.md`
> - Seed script: `src/prisma/scripts/seed-health-entity-v1.sql`

---

## Prerequisites

| Requirement | Check |
|---|---|
| App running locally | `npm run start:dev` — server on `http://localhost:3000` |
| DB running | `docker compose up -d giga-meter-db` |
| Migrations applied | `npx prisma migrate deploy` |
| `psql` installed | `psql --version` — see install note below if missing |

**Install `psql` (macOS)**
```bash
brew install libpq && brew link --force libpq
```

---

## Step 1 — Seed the database

Run the seed script against your local database. This is safe to run multiple
times — all inserts are idempotent.

```bash
psql postgresql://postgres:postgres@localhost:5432/dev_oia_dailychkappdb \
  -f src/prisma/scripts/seed-health-entity-v1.sql
```

**What gets seeded**

| Table | Rows | Purpose |
|---|---|---|
| `entity_type` | 2 | Normalises codes to `school` / `health` |
| `country` | 3 | KE, UZ, ZA |
| `health` | 3 | KE facility (id=4001), UZ fixture (id=4002), ZA fixture (id=4003) |
| `school` | 1 | KE school (id=1234) with PostGIS geopoint |
| `country_entity_type_whitelist` | 4 | KE×school, KE×health, UZ×health, ZA×health |
| `registration` | 5 | 2 KE devices, 1 UZ, 1 ZA, 1 blocked (id=999999) |
| `measurements` | 2 | Pre-seeded fixture rows for `GET /v2/entity` |

**Verify the seed**
```bash
psql postgresql://postgres:postgres@localhost:5432/dev_oia_dailychkappdb -c "
SELECT 'entity_type'                   AS table_name, COUNT(*)::int AS rows FROM entity_type
UNION ALL
SELECT 'country',                      COUNT(*)::int FROM country WHERE code IN ('KE','UZ','ZA')
UNION ALL
SELECT 'health (active)',              COUNT(*)::int FROM health WHERE deleted IS NULL
UNION ALL
SELECT 'school (active)',              COUNT(*)::int FROM school WHERE deleted IS NULL
UNION ALL
SELECT 'country_entity_type_whitelist',COUNT(*)::int FROM country_entity_type_whitelist
UNION ALL
SELECT 'registration',                 COUNT(*)::int FROM registration
UNION ALL
SELECT 'registration (blocked)',       COUNT(*)::int FROM registration WHERE is_blocked = true
UNION ALL
SELECT 'measurements (fixture)',       COUNT(*)::int FROM measurements WHERE source = 'DailyCheckApp'
ORDER BY table_name;
"
```

Expected output:
```
        table_name               | rows
---------------------------------+------
 country                         |    3
 country_entity_type_whitelist   |    4
 entity_type                     |    2
 health (active)                 |    3
 measurements (fixture)          |    2
 registration                    |    5
 registration (blocked)          |    1
 school (active)                 |    1
```

---

## Step 2 — Get a Device token

Required before any `POST /api/v1/measurements/v2` call.
Device tokens expire after **3 minutes** — get a fresh one each test session.

```bash
curl -s -X POST http://localhost:3000/api/v1/auth/initialize \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

Response:
```json
{
  "token":     "<device-token>",
  "expiresAt": 1705247611000,
  "expiresIn": 180000,
  "issuedAt":  1705247431000,
  "success":   true
}
```

Copy `token` — substitute `<device-token>` in the measurement curls below.

---

## Step 3 — Test the new endpoints

### Auth reference

| Endpoint | Auth type |
|---|---|
| `POST /api/v1/registration` | None (public) |
| `POST /api/v1/nearest-facility` | None (public) |
| `POST /api/v1/measurements/v2` | `Authorization: Device <device-token>` |
| `GET /api/v1/health` | `Authorization: Bearer <api-key>` |
| `GET /api/v1/health/giga-id/:giga_id` | `Authorization: Bearer <api-key>` |
| `GET /api/v1/measurements/v2/entity` | `Authorization: Bearer <api-key>` |

> `<api-key>` is your existing vendor Bearer token — the same one used for
> `GET /api/v1/measurements` and other protected endpoints.

---

### POST /api/v1/registration — health device

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

Expected `201`:
```json
{
  "giga_id":         "hf-a1b2c3d4-5e6f-7890-abcd-ef1234567890",
  "registration_id": "<new-id>",
  "entity_type":     "health"
}
```

---

### POST /api/v1/registration — school device

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

Expected `201`:
```json
{
  "giga_id":         "2abb47dd-3fca-44b1-b6c8-0ec0c863c236",
  "registration_id": "<new-id>",
  "entity_type":     "school"
}
```

---

### POST /api/v1/nearest-facility — health

```bash
curl -s -X POST http://localhost:3000/api/v1/nearest-facility \
  -H "Content-Type: application/json" \
  -d '{
    "latitude":    -1.2921,
    "longitude":   36.8219,
    "entity_type": "health"
  }'
```

Expected `200` — returns seeded KE facility ~38 m away:
```json
{
  "success": true,
  "data": {
    "id":              "4001",
    "name":            "Nairobi Level 4 Health Centre",
    "giga_id":         "hf-a1b2c3d4-5e6f-7890-abcd-ef1234567890",
    "entity_type":     "health",
    "latitude":        -1.2918,
    "longitude":       36.8217,
    "country_code":    "KE",
    "distance_meters": 38.72
  },
  "timestamp": "...",
  "message":   "success"
}
```

---

### POST /api/v1/nearest-facility — school

```bash
curl -s -X POST http://localhost:3000/api/v1/nearest-facility \
  -H "Content-Type: application/json" \
  -d '{
    "latitude":    -1.2921,
    "longitude":   36.8219,
    "entity_type": "school"
  }'
```

Expected `200` — returns seeded KE school ~38 m away.

---

### POST /api/v1/measurements/v2 — health measurement

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

Expected `201`:
```json
{ "success": true, "data": { "user_id": "<uuid>" }, "timestamp": "...", "message": "success" }
```

---

### POST /api/v1/measurements/v2 — school measurement

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

Expected `201`:
```json
{ "success": true, "data": { "user_id": "<uuid>" }, "timestamp": "...", "message": "success" }
```

---

### GET /api/v1/health — list facilities

```bash
curl -s "http://localhost:3000/api/v1/health?country_code=KE&size=10" \
  -H "Authorization: Bearer <api-key>"
```

Expected `200` — array containing the KE facility (`id: "4001"`).

---

### GET /api/v1/health/giga-id/:giga_id — single facility

```bash
curl -s "http://localhost:3000/api/v1/health/giga-id/hf-a1b2c3d4-5e6f-7890-abcd-ef1234567890" \
  -H "Authorization: Bearer <api-key>"
```

Expected `200`:
```json
{
  "success": true,
  "data": {
    "id":                      "4001",
    "health_id_giga":          "hf-a1b2c3d4-5e6f-7890-abcd-ef1234567890",
    "facility_name":           "Nairobi Level 4 Health Centre",
    "facility_level":          "Level 4",
    "facility_type_govt":      "Dispensary",
    "facility_ownership_govt": "Public",
    "latitude":                -1.2918,
    "longitude":               36.8217,
    "country_code":            "KE",
    "admin1":                  "Nairobi",
    "admin2":                  "Westlands",
    "dhis2_id":                "DHIS2-KE-40001",
    "is_facility_open":        true,
    "connectivity":            "Yes",
    "electricity_availability":"Yes",
    "num_staff":               12,
    "pop_within_5km":          34200
  },
  "timestamp": "...",
  "message": "success"
}
```

---

### GET /api/v1/measurements/v2/entity — all health measurements

```bash
curl -s "http://localhost:3000/api/v1/measurements/v2/entity?entity_type=health&size=10" \
  -H "Authorization: Bearer <api-key>"
```

Expected `200` — plain array including the 2 pre-seeded fixture rows (UZ and ZA).

**Filter by specific facility**
```bash
curl -s "http://localhost:3000/api/v1/measurements/v2/entity?giga_id_health=hf-a1b2c3d4-5e6f-7890-abcd-ef1234567890&size=10" \
  -H "Authorization: Bearer <api-key>"
```

**Filter by date range**
```bash
curl -s "http://localhost:3000/api/v1/measurements/v2/entity?entity_type=health&filterBy=timestamp&filterCondition=gt&filterValue=2026-04-15T00:00:00.000Z&orderBy=timestamp&size=100" \
  -H "Authorization: Bearer <api-key>"
```

---

## Step 4 — Test error cases

| # | Expected | Command |
|---|---|---|
| 1 | `400` both IDs | See below |
| 2 | `400` neither ID | See below |
| 3 | `404` unknown giga_id | See below |
| 4 | `403` country not whitelisted | See below |
| 5 | `400` blocked registration | See below |
| 6 | `404` facility not found by giga-id | See below |

### 400 — both IDs provided
```bash
curl -s -X POST http://localhost:3000/api/v1/registration \
  -H "Content-Type: application/json" \
  -d '{
    "giga_id_school": "2abb47dd-3fca-44b1-b6c8-0ec0c863c236",
    "giga_id_health": "hf-a1b2c3d4-5e6f-7890-abcd-ef1234567890",
    "country_code":   "KE"
  }'
```

### 400 — neither ID provided
```bash
curl -s -X POST http://localhost:3000/api/v1/registration \
  -H "Content-Type: application/json" \
  -d '{ "country_code": "KE" }'
```

### 404 — unknown giga_id_health
```bash
curl -s -X POST http://localhost:3000/api/v1/registration \
  -H "Content-Type: application/json" \
  -d '{ "giga_id_health": "does-not-exist", "country_code": "KE" }'
```

### 403 — country not whitelisted
```bash
curl -s -X POST http://localhost:3000/api/v1/registration \
  -H "Content-Type: application/json" \
  -d '{ "giga_id_health": "hf-a1b2c3d4-5e6f-7890-abcd-ef1234567890", "country_code": "NG" }'
```

### 400 — blocked registration (id=999999 seeded with is_blocked=true)
```bash
curl -s -X POST http://localhost:3000/api/v1/measurements/v2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Device <device-token>" \
  -d '{
    "giga_id_health":  "hf-a1b2c3d4-5e6f-7890-abcd-ef1234567890",
    "registration_id": 999999,
    "entity_type":     "health",
    "Timestamp":       "2024-01-14T15:13:30.824Z",
    "Download":        10.0,
    "Upload":          5.0,
    "Latency":         20
  }'
```

### 404 — facility not found by giga-id
```bash
curl -s "http://localhost:3000/api/v1/health/giga-id/does-not-exist" \
  -H "Authorization: Bearer <api-key>"
```

---

## Pull request test plan

Use this checklist when reviewing or QA-ing the health entity V1 API PR.

### Setup (required before any endpoint test)

- [ ] Migrations applied: `npx prisma migrate deploy`
- [ ] Seed data loaded (idempotent — safe to re-run):

```bash
psql postgresql://postgres:postgres@localhost:5432/dev_oia_dailychkappdb \
  -f src/prisma/scripts/seed-health-entity-v1.sql
```

The seed script provisions `entity_type`, `country`, `health`, `school`,
`country_entity_type_whitelist`, `registration`, and fixture `measurements` rows.
Without it, registration and health endpoints return `404` / `403` because
whitelist and facility rows are missing.

- [ ] App running: `npm run start:dev`
- [ ] For local manual testing without auth: `USE_AUTH=false` in `.env`

### Automated tests

- [ ] `npm test -- src/health/health.service.spec.ts`
- [ ] `npm test -- src/registration/registration.service.spec.ts`
- [ ] `npm test -- src/nearest-facility/nearest-facility.service.spec.ts`
- [ ] `npm test -- src/measurement/measurement.service.spec.ts`

### Endpoint smoke tests

- [ ] `POST /api/v1/registration` with seeded `giga_id_health` → `201`
- [ ] `GET /api/v1/health` → paginated list includes Nairobi facility
- [ ] `GET /api/v1/health/giga-id/hf-a1b2c3d4-5e6f-7890-abcd-ef1234567890` → `200`
- [ ] `POST /api/v1/nearest-facility` with `entity_type: health` near Nairobi → `200`
- [ ] `POST /api/v1/measurements/v2` with health payload → `201`
- [ ] `GET /api/v1/measurements/v2/entity?giga_id_health=...` → fixture rows returned
- [ ] School-only flows (`POST /api/v1/measurements`, `GET /api/v1/measurements/v2`) unchanged
