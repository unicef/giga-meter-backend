-- App instances on results: the app sends its app_instance_id with every
-- measurement and ping, so each result says which install (Windows user,
-- registration) it came from without going through browser_id / user_id.
-- Nullable: older apps send none, and adding them doesn't rewrite the tables.
ALTER TABLE "measurements" ADD COLUMN IF NOT EXISTS "app_instance_id" TEXT;
ALTER TABLE "connectivity_ping_checks" ADD COLUMN IF NOT EXISTS "app_instance_id" TEXT;
ALTER TABLE "connectivity_ping_checks_daily_aggr" ADD COLUMN IF NOT EXISTS "app_instance_id" TEXT;

-- Measurements by app instance. measurements is a large table: create this
-- beforehand with CREATE INDEX CONCURRENTLY and this becomes a no-op.
CREATE INDEX IF NOT EXISTS "measurements_app_instance_id_idx" ON "measurements"("app_instance_id");
