-- AlterTable
-- server_timestamp: M-Lab's clock when the speed test started. The existing
-- `timestamp` column comes from the client machine's own clock, which on these
-- devices is often wrong; this is a second, independent reference point next
-- to it, not a replacement. It is read from ConnectionInfo.StartTime in the
-- ndt7 server messages the app already uploads in `results` (download leg
-- first, then upload), never from a client field. Existing rows are
-- backfilled below from the same field; rows without a server measurement
-- stay null.
ALTER TABLE "measurements" ADD COLUMN "server_timestamp" TIMESTAMPTZ(6);

-- Backfill. The format check keeps one malformed value from failing the cast
-- and aborting the whole migration.
UPDATE "measurements"
SET "server_timestamp" = COALESCE(
  CASE
    WHEN "results" #>> '{NDTResult.S2C,LastServerMeasurement,ConnectionInfo,StartTime}'
      ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$'
    THEN ("results" #>> '{NDTResult.S2C,LastServerMeasurement,ConnectionInfo,StartTime}')::timestamptz
  END,
  CASE
    WHEN "results" #>> '{NDTResult.C2S,LastServerMeasurement,ConnectionInfo,StartTime}'
      ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$'
    THEN ("results" #>> '{NDTResult.C2S,LastServerMeasurement,ConnectionInfo,StartTime}')::timestamptz
  END
)
WHERE "results" IS NOT NULL;
