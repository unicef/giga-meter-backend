-- Review follow-up on PR #349. Forward-only: the already-created
-- 20260807120000_add_upload_failed_and_schedule_context migration is left
-- untouched, so environments that already applied it keep their checksum and
-- their data.

-- STATEMENT ORDER IS LOAD-BEARING.
--
-- Prisma runs each migration file in a transaction, so every lock taken here is
-- held until the file commits. ALTER TABLE ... RENAME COLUMN takes
-- ACCESS EXCLUSIVE, which blocks every read and write on measurements. The
-- UPDATEs below take only ROW EXCLUSIVE, which blocks neither.
--
-- With the rename first (as this migration was originally written) the
-- ACCESS EXCLUSIVE lock is held across all three UPDATEs -- and those are
-- sequential scans, because scheduled_slot has no index. On a production-sized
-- measurements table that locks out all traffic for the length of three full
-- scans.
--
-- Doing the UPDATEs first keeps the exclusive lock to the last statement, so it
-- is held for the milliseconds between the rename and the commit. The scans
-- still happen, but reads and writes continue during them.

-- scheduled_slot: replace the opaque codes with the fixed windows they already
-- stand for. 'startup' and NULL (manual runs) are unchanged.
-- These match zero rows on an environment that is applying
-- 20260807120000 in the same deploy: the column is created all-NULL and no
-- application version that writes 'A'/'B'/'C' has run against it yet.
UPDATE "measurements" SET "scheduled_slot" = 'morning'   WHERE "scheduled_slot" = 'A'; -- 8:00 AM - 12:00 PM
UPDATE "measurements" SET "scheduled_slot" = 'afternoon' WHERE "scheduled_slot" = 'B'; -- 12:00 PM - 4:00 PM
UPDATE "measurements" SET "scheduled_slot" = 'evening'   WHERE "scheduled_slot" = 'C'; -- 4:00 PM onwards

-- upload_failed -> offline_synced. Same boolean, clearer name: by the time the
-- row exists the upload succeeded, it just arrived through the offline sync
-- queue instead of the realtime path. RENAME preserves values and the default.
-- Metadata-only, so once the lock is granted this is effectively instant.
ALTER TABLE "measurements" RENAME COLUMN "upload_failed" TO "offline_synced";
