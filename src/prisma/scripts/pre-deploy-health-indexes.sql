-- ============================================================
-- Health facilities: indexes on the large tables, built before deploying
-- migration 20261014114248_add_health_facilities.
-- ============================================================
-- measurements and connectivity_ping_checks are large on production. The
-- migration runs in one transaction, where a plain CREATE INDEX would hold a
-- lock that blocks writes for the whole build. CREATE INDEX CONCURRENTLY does
-- not, but it cannot run inside a transaction, so it lives here.
--
-- Run with psql, one statement at a time (not inside BEGIN/COMMIT), on staging
-- and production BEFORE the deploy. The migration's CREATE INDEX IF NOT EXISTS
-- lines then skip these indexes.
--
-- The columns must exist first. If they do not yet, run only the ADD COLUMN
-- lines below (cheap, metadata only), then the indexes.
--
-- Usage:
--   psql "$DATABASE_URL" -f src/prisma/scripts/pre-deploy-health-indexes.sql

ALTER TABLE "measurements" ADD COLUMN IF NOT EXISTS "giga_id_health" TEXT;
ALTER TABLE "measurements" ADD COLUMN IF NOT EXISTS "registration_id" BIGINT;
ALTER TABLE "connectivity_ping_checks" ADD COLUMN IF NOT EXISTS "giga_id_health" TEXT;
ALTER TABLE "connectivity_ping_checks" ADD COLUMN IF NOT EXISTS "registration_id" BIGINT;

CREATE INDEX CONCURRENTLY IF NOT EXISTS "measurements_registration_id_idx" ON "measurements"("registration_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "measurements_giga_id_health_idx" ON "measurements"("giga_id_health");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "connectivity_ping_checks_registration_id_idx" ON "connectivity_ping_checks"("registration_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "connectivity_ping_checks_giga_id_health_idx" ON "connectivity_ping_checks"("giga_id_health");

-- A failed concurrent build leaves an INVALID index behind, and IF NOT EXISTS
-- would then skip it. This must return no rows before deploying; drop and
-- rebuild any index it lists.
SELECT indexrelid::regclass AS invalid_index
FROM pg_index
WHERE NOT indisvalid;
