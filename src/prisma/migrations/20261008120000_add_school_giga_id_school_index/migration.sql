-- Feature flags, the school coordinates checked on every measurement and the
-- is_verified lookup all find a school by giga_id_school, which had no index:
-- each call was a full scan of the school table.
--
-- On a large table, create the index beforehand without locking writes:
--   CREATE INDEX CONCURRENTLY IF NOT EXISTS "school_giga_id_school_idx" ON "school"("giga_id_school");
-- This migration is then a no-op.
CREATE INDEX IF NOT EXISTS "school_giga_id_school_idx" ON "school"("giga_id_school");
