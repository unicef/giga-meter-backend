-- ============================================================
-- Project Connect / Daily Check App — Spain (ES) manual-test seed
-- ============================================================
-- Populates the minimum master data needed to exercise, end to end,
-- the two registration flows of the Daily Check App against a LOCAL
-- backend:
--
--   1. SCHOOL flow   — pick country "Spain", type a school id.
--   2. HEALTH flow   — pick country "Spain", type a facility (govt) id.
--
-- What the app needs (traced from the frontend services + backend):
--   * dailycheckapp_country   → country dropdown        (GET /countries,
--                                                         GET /dailycheckapp_countries/:code)
--   * country                 → FK target for whitelist / school / health
--   * facility_type           → 'school' / 'health' rows with normalised codes
--   * country_facility_type_whitelist
--                             → which flows are enabled per country
--                               (GET /api/v2/countries → supported_facility_types)
--   * school                  → matched by external_id + country_code
--                               (GET /api/v1/schools/country_code_school_id/ES/:id)
--   * health                  → matched by country_code + govt_id
--                               (GET /api/v2/health?country_code=ES&govt_id=:id)
--
-- Registrations / measurements are intentionally NOT seeded — creating
-- those is the whole point of the manual test, so the app produces them.
--
-- Usage:
--   psql "$DATABASE_URL" -f src/prisma/scripts/seed-spain-project-connect.sql
--
-- Prerequisites:
--   All migrations applied first (incl. the health-entity / facility_type set).
--
-- Idempotent: safe to run multiple times.
--
-- ── IDs to type in the app while testing ─────────────────────────────
--   Country:            Spain  (ES)
--   SCHOOL flow  → id:  ES-TEST-SCHOOL-01   (school.external_id)
--   HEALTH flow  → id:  ES-TEST-HEALTH-01   (health.dhis2_id / govt_id)
--   School giga_id:     11111111-1111-4111-8111-111111111111
--   Health giga_id:     22222222-2222-4222-8222-222222222222
-- ---------------------------------------------------------------------
BEGIN;

-- ============================================================
-- 0.  facility_type — ensure 'school' / 'health' with correct codes
-- ============================================================
-- The migration seed (20260521135124) inserted code='SCHL'/'HLTH';
-- the v2 API contract keys on code = 'school'/'health'. Normalise, and
-- insert as a fallback for DBs where the seed never ran.
UPDATE facility_type SET code = 'school' WHERE name = 'school' AND code <> 'school';
UPDATE facility_type SET code = 'health' WHERE name = 'health' AND code <> 'health';

INSERT INTO facility_type (name, code) VALUES ('school', 'school')
ON CONFLICT (code) DO NOTHING;
INSERT INTO facility_type (name, code) VALUES ('health', 'health')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 1.  country (ES) — FK target for whitelist / school / health
-- ============================================================
INSERT INTO country (name, code, iso3_format, is_active)
VALUES ('Spain', 'ES', 'ESP', true)
ON CONFLICT (code) DO UPDATE
SET name        = EXCLUDED.name,
    iso3_format = EXCLUDED.iso3_format,
    is_active   = true;

-- ============================================================
-- 2.  dailycheckapp_country (ES) — backs the country dropdown
-- ============================================================
-- id 34 / country_id '216' follow the convention already used by
-- local-dev-seed.sql and insert_dailycheck_countries.sql.
INSERT INTO dailycheckapp_country (id, code, code_iso3, name, country_id)
VALUES (34, 'ES', 'ESP', 'Spain', '216')
ON CONFLICT (id) DO UPDATE
SET code      = EXCLUDED.code,
    code_iso3 = EXCLUDED.code_iso3,
    name      = EXCLUDED.name,
    country_id= EXCLUDED.country_id;

-- ============================================================
-- 3.  country_facility_type_whitelist — enable BOTH flows for ES
-- ============================================================
-- Drives GET /api/v2/countries → supported_facility_types, and is the
-- backend gate for POST /api/v1/registration (403 otherwise).
-- Subselects so it works regardless of facility_type.id values.
INSERT INTO country_facility_type_whitelist (country_code, facility_type_id)
SELECT 'ES', id FROM facility_type WHERE code = 'school'
ON CONFLICT (country_code, facility_type_id) DO NOTHING;

INSERT INTO country_facility_type_whitelist (country_code, facility_type_id)
SELECT 'ES', id FROM facility_type WHERE code = 'health'
ON CONFLICT (country_code, facility_type_id) DO NOTHING;

-- ============================================================
-- 4.  school — Spain test school (SCHOOL flow)
-- ============================================================
-- Looked up by external_id (case-insensitive) + country_code + is_active
-- + deleted IS NULL. geopoint is PostGIS geography(Point,4326):
-- ST_MakePoint(longitude, latitude) — argument order matters.
INSERT INTO school (
  id, external_id, giga_id_school, name,
  country_id, country_code, address,
  admin_1_name, education_level,
  geopoint, is_active, created, modified, deleted
) VALUES (
  900001,
  'ES-TEST-SCHOOL-01',
  '11111111-1111-4111-8111-111111111111',
  'Spain Test School 01',
  216, 'ES', 'Calle de Prueba 1, Madrid',
  'Madrid', 'Primary',
  ST_SetSRID(ST_MakePoint(-3.7038, 40.4168), 4326)::geography,
  true, NOW(), NOW(), NULL
)
ON CONFLICT (id) DO NOTHING;

-- Keep the sequence ahead of the explicit id.
SELECT setval(
  pg_get_serial_sequence('school', 'id'),
  GREATEST(COALESCE((SELECT MAX(id) FROM school), 0), 900001)
);

-- ============================================================
-- 5.  health — Spain test health facility (HEALTH flow)
-- ============================================================
-- Looked up by country_code + govt_id (matched against
-- dhis2_id / hims_id / hfml_id). Required non-null columns:
-- health_id_giga, facility_name, facility_data_source, signature,
-- latitude, longitude.
INSERT INTO health (
  id, health_id_giga, facility_name, facility_data_source, signature,
  latitude, longitude,
  dhis2_id, facility_level, facility_type_govt, facility_ownership_govt,
  country_code, admin1, admin2,
  is_facility_open, connectivity, electricity_availability,
  num_staff, pop_within_5km,
  created, modified, deleted
) VALUES (
  900001,
  '22222222-2222-4222-8222-222222222222',
  'Spain Test Health Facility 01',
  'DHIS2',
  'seed-sig-es-hf-01',
  40.4168, -3.7038,
  'ES-TEST-HEALTH-01',
  'Level 2', 'Clinic', 'Public',
  'ES', 'Madrid', 'Madrid',
  true, 'Yes', 'Yes',
  10, 25000,
  NOW(), NOW(), NULL
)
ON CONFLICT (id) DO NOTHING;

-- Keep the sequence ahead of the explicit id.
SELECT setval(
  pg_get_serial_sequence('health', 'id'),
  GREATEST(COALESCE((SELECT MAX(id) FROM health), 0), 900001)
);

COMMIT;

-- ============================================================
-- Verification — quick sanity check after seed
-- ============================================================
SELECT 'country (ES)'                 AS "check", COUNT(*)::int AS rows
  FROM country WHERE code = 'ES' AND is_active
UNION ALL
SELECT 'dailycheckapp_country (ES)',  COUNT(*)::int
  FROM dailycheckapp_country WHERE code = 'ES'
UNION ALL
SELECT 'facility_type (school+health)', COUNT(*)::int
  FROM facility_type WHERE code IN ('school', 'health')
UNION ALL
SELECT 'whitelist ES (both flows)',   COUNT(*)::int
  FROM country_facility_type_whitelist WHERE country_code = 'ES'
UNION ALL
SELECT 'school ES-TEST-SCHOOL-01',    COUNT(*)::int
  FROM school WHERE external_id = 'ES-TEST-SCHOOL-01' AND country_code = 'ES'
             AND is_active AND deleted IS NULL
UNION ALL
SELECT 'health ES-TEST-HEALTH-01',    COUNT(*)::int
  FROM health WHERE dhis2_id = 'ES-TEST-HEALTH-01' AND country_code = 'ES'
             AND deleted IS NULL
ORDER BY "check";
