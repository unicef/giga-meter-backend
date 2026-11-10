-- AlterTable
-- server_timestamp: M-Lab's clock when the speed test started. The existing
-- `timestamp` column comes from the client machine's own clock, which on these
-- devices is often wrong; this is a second, independent reference point next
-- to it, not a replacement. It is read from ConnectionInfo.StartTime in the
-- ndt7 server messages the app uploads in `results` (download leg first, then
-- upload), never from a client field. Existing rows are not backfilled and
-- stay null.
ALTER TABLE "measurements" ADD COLUMN "server_timestamp" TIMESTAMPTZ(6);
