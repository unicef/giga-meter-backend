-- Review follow-up on PR #349. Forward-only: the already-created
-- 20260807120000_add_upload_failed_and_schedule_context migration is left
-- untouched, so environments that already applied it keep their checksum and
-- their data.

-- upload_failed -> offline_synced. Same boolean, clearer name: by the time the
-- row exists the upload succeeded, it just arrived through the offline sync
-- queue instead of the realtime path. RENAME preserves values and the default.
ALTER TABLE "measurements" RENAME COLUMN "upload_failed" TO "offline_synced";

-- scheduled_slot: replace the opaque codes with the fixed windows they already
-- stand for. 'startup' and NULL (manual runs) are unchanged.
UPDATE "measurements" SET "scheduled_slot" = 'morning'   WHERE "scheduled_slot" = 'A'; -- 8:00 AM - 12:00 PM
UPDATE "measurements" SET "scheduled_slot" = 'afternoon' WHERE "scheduled_slot" = 'B'; -- 12:00 PM - 4:00 PM
UPDATE "measurements" SET "scheduled_slot" = 'evening'   WHERE "scheduled_slot" = 'C'; -- 4:00 PM onwards
