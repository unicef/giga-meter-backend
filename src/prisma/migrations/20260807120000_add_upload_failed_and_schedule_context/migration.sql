-- AlterTable
-- upload_failed: true = the realtime upload from the app failed and the record
-- arrived later via the offline sync queue.
-- scheduled_slot / scheduled_at: which slot ('A'|'B'|'C'|'startup', null for
-- manual runs) and originally planned run time the measurement belongs to.
ALTER TABLE "measurements" ADD COLUMN     "scheduled_at" TIMESTAMPTZ(6),
ADD COLUMN     "scheduled_slot" VARCHAR(16),
ADD COLUMN     "upload_failed" BOOLEAN DEFAULT false;
