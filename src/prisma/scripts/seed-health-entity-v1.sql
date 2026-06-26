-- ============================================================
-- Health Entity V1 — Dev / QA Seed Data
-- ============================================================
-- Populates the minimum set of rows needed to exercise every
-- endpoint example in:
--   docs/health-entity-v1-api-changes.md
--   docs/health-entity-v1-backend-refactor.md
--
-- Usage:
--   psql $DATABASE_URL -f src/prisma/scripts/seed-health-entity-v1.sql
--
-- Prerequisites:
--   All health-entity-v1 migrations must be applied first.
--
-- Idempotent: safe to run multiple times.
--   * INSERT rows use ON CONFLICT DO NOTHING (keyed on PK or unique col).
--   * facility_type code UPDATE is a no-op when already correct.
--   * Fixture measurements are guarded by a WHERE NOT EXISTS check.
-- ============================================================

BEGIN;

-- ============================================================
-- 0.  facility_type — normalise codes
-- ============================================================
-- The migration seed (20260521135124) inserted code='SCHL'/'HLTH'.
-- Application code calls FacilityTypeService.getByCode('school'/'health'),
-- so the codes must match.  This UPDATE is a no-op if already correct.
-- ============================================================
UPDATE facility_type SET code = 'school' WHERE name = 'school' AND code <> 'school';
UPDATE facility_type SET code = 'health' WHERE name = 'health' AND code <> 'health';

-- Fallback: insert rows if the migration seed was never applied.
INSERT INTO facility_type (name, code)
VALUES ('school', 'school')
ON CONFLICT (code) DO NOTHING;

INSERT INTO facility_type (name, code)
VALUES ('health', 'health')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 1.  country — FK required by health, school, and whitelist
-- ============================================================
INSERT INTO country (code, name, iso3_format, is_active)
VALUES
  ('KE', 'Kenya',        'KEN', true),
  ('UZ', 'Uzbekistan',   'UZB', true),
  ('ZA', 'South Africa', 'ZAF', true)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 2.  health — master facility records
-- ============================================================
-- IDs match the "id" values shown in API response examples in the docs.
-- Required non-nullable columns: health_id_giga, facility_name,
--   facility_data_source, signature, latitude, longitude.
--
-- Note: health.id is BIGSERIAL — explicit IDs are inserted directly
-- without OVERRIDING SYSTEM VALUE (SERIAL, not IDENTITY).
-- Sequence is advanced at the end of this section.
-- ============================================================
INSERT INTO health (
  id,
  health_id_giga,
  facility_name,
  facility_data_source,
  signature,
  latitude,
  longitude,
  facility_level,
  facility_type_govt,
  facility_ownership_govt,
  country_code,
  admin1,
  admin2,
  dhis2_id,
  is_facility_open,
  connectivity,
  electricity_availability,
  num_staff,
  pop_within_5km,
  created,
  modified,
  deleted
) VALUES
  -- ── KE health facility ──────────────────────────────────────
  -- Used in: POST /api/v1/registration (health request body)
  --          POST /api/v1/measurements/v2 (health request body)
  --          GET  /api/v1/health (list response example)
  --          GET  /api/v1/health/giga-id/:giga_id (detail response)
  --          POST /api/v1/nearest-facility (response example)
  (
    4001,
    'hf-a1b2c3d4-5e6f-7890-abcd-ef1234567890',
    'Nairobi Level 4 Health Centre',
    'DHIS2',
    'seed-sig-ke-001',
    -1.2918,
    36.8217,
    'Level 4',
    'Dispensary',
    'Public',
    'KE',
    'Nairobi',
    'Westlands',
    'DHIS2-KE-40001',
    true,
    'Yes',
    'Yes',
    12,
    34200,
    NOW(),
    NOW(),
    NULL
  ),
  -- ── UZ health facility ──────────────────────────────────────
  -- Used in: GET /api/v1/measurements/v2/entity (fixture row 1)
  --          registration_id=1001
  (
    4002,
    '166a7f2d-b341-3762-ac7f-77b02745cf81',
    'Tashkent District Health Facility',
    'DHIS2',
    'seed-sig-uz-001',
    41.2995,
    69.2401,
    'Level 3',
    'Health Post',
    'Public',
    'UZ',
    'Tashkent',
    'Mirabad',
    NULL,
    true,
    'Yes',
    'Yes',
    8,
    18500,
    NOW(),
    NOW(),
    NULL
  ),
  -- ── ZA health facility ──────────────────────────────────────
  -- Used in: GET /api/v1/measurements/v2/entity (fixture row 2)
  --          registration_id=1247
  (
    4003,
    '2a8c9f4d-1e22-4b58-9a0c-5d3e8b7f1a92',
    'Johannesburg North Clinic',
    'DHIS2',
    'seed-sig-za-001',
    -26.2041,
    28.0473,
    'Level 2',
    'Clinic',
    'Public',
    'ZA',
    'Gauteng',
    'Johannesburg',
    NULL,
    true,
    'Yes',
    'Yes',
    5,
    22000,
    NOW(),
    NOW(),
    NULL
  )
ON CONFLICT (id) DO NOTHING;

-- Advance the health sequence past the seeded IDs so the next
-- autoincrement row doesn't collide.
SELECT setval(
  pg_get_serial_sequence('health', 'id'),
  GREATEST(COALESCE((SELECT MAX(id) FROM health), 0), 4003)
);

-- ============================================================
-- 3.  school — master school records
-- ============================================================
-- geopoint is a PostGIS geography(Point, 4326) column.
-- ST_MakePoint(longitude, latitude) — note argument order.
-- ============================================================
INSERT INTO school (
  id,
  giga_id_school,
  name,
  country_code,
  address,
  external_id,
  geopoint,
  created,
  modified,
  deleted,
  is_active
) VALUES (
  -- ── KE school ───────────────────────────────────────────────
  -- Used in: POST /api/v1/registration (school request body)
  --          POST /api/v1/measurements/v2 (school request body)
  --          POST /api/v1/nearest-school (response example)
  --          POST /api/v1/nearest-facility?facility_type=school (response)
  1234,
  '2abb47dd-3fca-44b1-b6c8-0ec0c863c236',
  'Westlands Primary School',
  'KE',
  'Westlands Rd, Nairobi',
  'KE-12345',
  ST_SetSRID(ST_MakePoint(36.8220, -1.2919), 4326)::geography,
  NOW(),
  NOW(),
  NULL,
  true
)
ON CONFLICT (id) DO NOTHING;

-- Advance the school sequence.
SELECT setval(
  pg_get_serial_sequence('school', 'id'),
  GREATEST(COALESCE((SELECT MAX(id) FROM school), 0), 1234)
);

-- ============================================================
-- 4.  country_facility_type_whitelist
-- ============================================================
-- Required for POST /api/v1/registration to succeed (403 otherwise).
-- Using subselects so this works regardless of facility_type.id values.
-- ============================================================
INSERT INTO country_facility_type_whitelist (country_code, facility_type_id)
SELECT 'KE', id FROM facility_type WHERE code = 'school'
ON CONFLICT (country_code, facility_type_id) DO NOTHING;

INSERT INTO country_facility_type_whitelist (country_code, facility_type_id)
SELECT 'KE', id FROM facility_type WHERE code = 'health'
ON CONFLICT (country_code, facility_type_id) DO NOTHING;

INSERT INTO country_facility_type_whitelist (country_code, facility_type_id)
SELECT 'UZ', id FROM facility_type WHERE code = 'health'
ON CONFLICT (country_code, facility_type_id) DO NOTHING;

INSERT INTO country_facility_type_whitelist (country_code, facility_type_id)
SELECT 'ZA', id FROM facility_type WHERE code = 'health'
ON CONFLICT (country_code, facility_type_id) DO NOTHING;

-- ============================================================
-- 5.  registration — sample device registrations
-- ============================================================
-- IDs match the registration_id values used in doc examples and
-- in the fixture measurements below.
-- ============================================================
INSERT INTO registration (
  id,
  facility_type_id,
  health_id,
  giga_id_health,
  school_id,
  giga_id_school,
  country_code,
  installation_id,
  os,
  app_version,
  mac_address,
  device_hardware_id,
  ip_address,
  network_information,
  wifi_connections,
  is_blocked,
  notify,
  is_active,
  created
)
-- ── KE health device — registration_id=987654 ───────────────
-- Used in: POST /api/v1/measurements/v2 health request body
--          POST /api/v1/registration health response example
SELECT
  987654,
  (SELECT id FROM facility_type WHERE code = 'health'),
  4001, 'hf-a1b2c3d4-5e6f-7890-abcd-ef1234567890',
  NULL, NULL,
  'KE',
  'win-install-id-abc123xyz',
  'Windows', '1.2.3',
  'AA:BB:CC:DD:EE:FF',
  'hw-fingerprint-abc123',
  '196.201.214.100',
  'Ethernet:OfficeNetwork',
  '[{"ssid":"OfficeWifi","strength":-55}]'::jsonb,
  false, false, true,
  to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
WHERE NOT EXISTS (SELECT 1 FROM registration WHERE id = 987654);

-- ── KE school device — registration_id=987655 ───────────────
-- Used in: POST /api/v1/registration school response (illustrative)
INSERT INTO registration (
  id,
  facility_type_id,
  health_id,
  giga_id_health,
  school_id,
  giga_id_school,
  country_code,
  installation_id,
  os,
  app_version,
  mac_address,
  device_hardware_id,
  ip_address,
  network_information,
  wifi_connections,
  is_blocked,
  notify,
  is_active,
  created
)
SELECT
  987655,
  (SELECT id FROM facility_type WHERE code = 'school'),
  NULL, NULL,
  1234, '2abb47dd-3fca-44b1-b6c8-0ec0c863c236',
  'KE',
  'win-install-id-def456uvw',
  'Windows', '1.2.3',
  '11:22:33:44:55:66',
  'hw-fingerprint-def456',
  '196.201.214.101',
  'WiFi:SchoolNetwork',
  '[{"ssid":"SchoolWifi","strength":-70}]'::jsonb,
  false, false, true,
  to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
WHERE NOT EXISTS (SELECT 1 FROM registration WHERE id = 987655);

-- ── UZ health device — registration_id=1001 ─────────────────
-- Used in: GET /api/v1/measurements/v2/entity fixture row 1
INSERT INTO registration (
  id,
  facility_type_id,
  health_id,
  giga_id_health,
  school_id,
  giga_id_school,
  country_code,
  installation_id,
  os,
  app_version,
  device_hardware_id,
  ip_address,
  network_information,
  wifi_connections,
  is_blocked,
  notify,
  is_active,
  created
)
SELECT
  1001,
  (SELECT id FROM facility_type WHERE code = 'health'),
  4002, '166a7f2d-b341-3762-ac7f-77b02745cf81',
  NULL, NULL,
  'UZ',
  'win-install-id-uz001',
  'Windows', '1.2.3',
  'hw-166a7f2d-b34',
  '10.2.1.2',
  'Ethernet:OfficeNetwork',
  NULL,
  false, false, true,
  to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
WHERE NOT EXISTS (SELECT 1 FROM registration WHERE id = 1001);

-- ── ZA health device — registration_id=1247 ─────────────────
-- Used in: GET /api/v1/measurements/v2/entity fixture row 2
INSERT INTO registration (
  id,
  facility_type_id,
  health_id,
  giga_id_health,
  school_id,
  giga_id_school,
  country_code,
  installation_id,
  os,
  app_version,
  device_hardware_id,
  ip_address,
  network_information,
  wifi_connections,
  is_blocked,
  notify,
  is_active,
  created
)
SELECT
  1247,
  (SELECT id FROM facility_type WHERE code = 'health'),
  4003, '2a8c9f4d-1e22-4b58-9a0c-5d3e8b7f1a92',
  NULL, NULL,
  'ZA',
  'win-install-id-za001',
  'Windows', '1.2.3',
  'hw-2a8c9f4d-1e2',
  '10.5.4.2',
  'Ethernet:OfficeNetwork',
  NULL,
  false, false, true,
  to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
WHERE NOT EXISTS (SELECT 1 FROM registration WHERE id = 1247);

-- ── Blocked health device — registration_id=999999 ─────────
-- Used to test: POST /api/v1/measurements/v2 with a blocked registration → 400
INSERT INTO registration (
  id,
  facility_type_id,
  health_id,
  giga_id_health,
  school_id,
  giga_id_school,
  country_code,
  installation_id,
  os,
  app_version,
  is_blocked,
  notify,
  is_active,
  created
)
SELECT
  999999,
  (SELECT id FROM facility_type WHERE code = 'health'),
  4001, 'hf-a1b2c3d4-5e6f-7890-abcd-ef1234567890',
  NULL, NULL,
  'KE',
  'win-install-id-blocked',
  'Windows', '1.2.3',
  true, false, true,
  to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
WHERE NOT EXISTS (SELECT 1 FROM registration WHERE id = 999999);

-- Advance the registration sequence past all seeded IDs.
SELECT setval(
  pg_get_serial_sequence('registration', 'id'),
  GREATEST(COALESCE((SELECT MAX(id) FROM registration), 0), 999999)
);

-- ============================================================
-- 6.  measurements — fixture rows
-- ============================================================
-- These reproduce the exact response shown in the
-- GET /api/v1/measurements/v2/entity example in the API changes doc.
-- Guarded by WHERE NOT EXISTS on browser_id to stay idempotent.
-- ============================================================

-- ── Fixture row 1 — UZ health measurement ───────────────────
INSERT INTO measurements (
  timestamp,
  browser_id,
  download,
  upload,
  latency,
  facility_type_id,
  giga_id_health,
  giga_id_school,
  school_id,
  registration_id,
  country_code,
  ip_address,
  app_version,
  source,
  device_hardware_id
)
SELECT
  '2026-04-15T08:42:11.000Z',
  'fixture-166a7f2d',
  337,
  173,
  41,
  (SELECT id FROM facility_type WHERE code = 'health'),
  '166a7f2d-b341-3762-ac7f-77b02745cf81',
  NULL, NULL,
  1001,
  'UZ',
  '10.2.1.2',
  '1.2.3',
  'DailyCheckApp',
  'hw-166a7f2d-b34'
WHERE NOT EXISTS (
  SELECT 1 FROM measurements WHERE browser_id = 'fixture-166a7f2d'
);

-- ── Fixture row 2 — ZA health measurement ───────────────────
INSERT INTO measurements (
  timestamp,
  browser_id,
  download,
  upload,
  latency,
  facility_type_id,
  giga_id_health,
  giga_id_school,
  school_id,
  registration_id,
  country_code,
  ip_address,
  app_version,
  source,
  device_hardware_id
)
SELECT
  '2026-04-15T09:17:43.000Z',
  'fixture-2a8c9f4d',
  12450,
  3210,
  67,
  (SELECT id FROM facility_type WHERE code = 'health'),
  '2a8c9f4d-1e22-4b58-9a0c-5d3e8b7f1a92',
  NULL, NULL,
  1247,
  'ZA',
  '10.5.4.2',
  '1.2.3',
  'DailyCheckApp',
  'hw-2a8c9f4d-1e2'
WHERE NOT EXISTS (
  SELECT 1 FROM measurements WHERE browser_id = 'fixture-2a8c9f4d'
);

COMMIT;

-- ============================================================
-- Verification — quick row counts after seed
-- ============================================================
SELECT 'facility_type'              AS "table", COUNT(*)::int AS rows FROM facility_type
UNION ALL
SELECT 'health (active)',                      COUNT(*)::int FROM health    WHERE deleted IS NULL
UNION ALL
SELECT 'school (active)',                      COUNT(*)::int FROM school    WHERE deleted IS NULL
UNION ALL
SELECT 'country_facility_type_whitelist',        COUNT(*)::int FROM country_facility_type_whitelist
UNION ALL
SELECT 'registration',                         COUNT(*)::int FROM registration
UNION ALL
SELECT 'measurements (health fixture)',        COUNT(*)::int FROM measurements
  WHERE browser_id IN ('fixture-166a7f2d', 'fixture-2a8c9f4d')
ORDER BY "table";
