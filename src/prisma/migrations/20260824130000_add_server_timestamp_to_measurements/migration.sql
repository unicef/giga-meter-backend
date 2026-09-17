-- AlterTable
-- server_timestamp: wall-clock time reported by M-Lab, captured by the ndt7
-- client from the Date header of the locate service response. The existing
-- `timestamp` column comes from the client machine's own clock, which on these
-- devices is often wrong; this is a second, independent reference point rather
-- than a replacement. Null for clients that do not send it, which is every
-- release before app v2.0.4.
ALTER TABLE "measurements" ADD COLUMN     "server_timestamp" TIMESTAMPTZ(6);
