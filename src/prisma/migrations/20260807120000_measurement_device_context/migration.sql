-- Device context, offline-sync flag and schedule context on measurements.
--
-- On staging this arrived as six migrations (PR #349, #353, #354, #356, #357,
-- #359, #360, #368, #369) that added columns, renamed two of them and dropped
-- four others as the field list settled. Replaying that history on a database
-- that has none of it only reproduces the churn, and two steps in it are
-- expensive on a large measurements table:
--
--   * ALTER TABLE ... RENAME COLUMN upload_failed TO offline_synced takes
--     ACCESS EXCLUSIVE, and Prisma runs a migration file in a transaction, so
--     that lock is held until the file commits.
--   * Three UPDATE ... WHERE scheduled_slot IN ('A','B','C') statements are
--     sequential scans; scheduled_slot has no index.
--
-- This migration declares the end state instead. Every column is created with
-- its final name and type, so there is no rename, no drop and no backfill: it
-- is a catalog-only change that completes in milliseconds regardless of table
-- size. Nullable columns and a constant DEFAULT are metadata-only in
-- PostgreSQL 11+, so no table rewrite happens either.
--
-- IF NOT EXISTS throughout: staging has already applied the original six and
-- has all of these columns, so this is a no-op there. Verified on a local
-- PostgreSQL that a database built by the original six and a database built by
-- this file end up with identical columns, types, nullability, defaults and
-- varchar lengths.

ALTER TABLE "measurements"
  ADD COLUMN IF NOT EXISTS "offline_synced"          BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "scheduled_slot"          VARCHAR(16),
  ADD COLUMN IF NOT EXISTS "scheduled_at"            TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "device_name"             TEXT,
  ADD COLUMN IF NOT EXISTS "device_model"            TEXT,
  ADD COLUMN IF NOT EXISTS "device_manufacturer"     TEXT,
  ADD COLUMN IF NOT EXISTS "app_build_number"        TEXT,
  ADD COLUMN IF NOT EXISTS "os_version"              TEXT,
  ADD COLUMN IF NOT EXISTS "wifi_unavailable_reason" VARCHAR(32),
  ADD COLUMN IF NOT EXISTS "ssid_source"             VARCHAR(16),
  ADD COLUMN IF NOT EXISTS "device_context"          JSONB;

ALTER TABLE "measurements_failed"
  ADD COLUMN IF NOT EXISTS "device_name"             TEXT,
  ADD COLUMN IF NOT EXISTS "device_model"            TEXT,
  ADD COLUMN IF NOT EXISTS "device_manufacturer"     TEXT,
  ADD COLUMN IF NOT EXISTS "app_build_number"        TEXT,
  ADD COLUMN IF NOT EXISTS "os_version"              TEXT,
  ADD COLUMN IF NOT EXISTS "wifi_unavailable_reason" VARCHAR(32),
  ADD COLUMN IF NOT EXISTS "ssid_source"             VARCHAR(16),
  ADD COLUMN IF NOT EXISTS "device_context"          JSONB;
