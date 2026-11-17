-- When the app worked out the detected location: the `geolocation.timestamp` it
-- sends with each measurement. When a lookup fails the app re-sends its saved
-- location with the original time, so this tells a fresh location from a re-used
-- one. It comes from the device clock: compare it with `timestamp`, not
-- `created_at`.
--
-- `measurements` is very large and migrations run at app boot (start.sh runs
-- `prisma migrate deploy`), so a slow migration means a crash loop. Keep this
-- metadata-only: nullable, no default, no index, no backfill, so Postgres
-- doesn't rewrite or scan either table.
ALTER TABLE "measurements" ADD COLUMN IF NOT EXISTS "detected_location_resolved_at" TIMESTAMPTZ(6);

ALTER TABLE "measurements_failed" ADD COLUMN IF NOT EXISTS "detected_location_resolved_at" TIMESTAMPTZ(6);
