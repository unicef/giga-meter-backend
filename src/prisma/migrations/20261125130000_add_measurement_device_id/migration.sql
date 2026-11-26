-- Device ID (TECH-8828) on each measurement: the PC of the registration it was
-- made under (browser_id is that registration's user_id), looked up when the
-- measurement is stored. Nullable, so adding it doesn't rewrite the table, and
-- measurements stored before this keep NULL.
ALTER TABLE "measurements" ADD COLUMN IF NOT EXISTS "device_id" TEXT;

-- Lookups and counts by PC. measurements is a large table: create this
-- beforehand with CREATE INDEX CONCURRENTLY and this becomes a no-op.
CREATE INDEX IF NOT EXISTS "measurements_device_id_idx" ON "measurements"("device_id");
