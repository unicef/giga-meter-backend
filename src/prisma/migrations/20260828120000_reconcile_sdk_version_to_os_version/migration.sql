-- Reconcile the sdk_version -> os_version rename.
--
-- Background: 20260819170230 added both `os_version` and `sdk_version`, and the
-- ORIGINAL 20260819171904 dropped `os_version` while keeping `sdk_version`.
-- Databases that applied those two are left with `sdk_version` and no
-- `os_version`. Commit 3249636 ("Rename sdk_version to os_version") tried to
-- flip this by editing the already-applied 20260819171904 in place, but
-- `prisma migrate deploy` never re-runs a migration already recorded in
-- `_prisma_migrations`, so those databases never received `os_version`. The
-- deployed client writes `os_version`, producing P2022 on every insert.
--
-- This forward-only migration brings every environment to the intended end
-- state (os_version present, sdk_version gone) regardless of current state.
--
-- IMPORTANT: metadata-only DDL. The rename path uses ALTER TABLE ... RENAME
-- COLUMN (instant, no row rewrite) rather than an add/backfill/drop, so it is
-- safe on very large tables and cannot exceed the container start-up window.

DO $$
BEGIN
  -- measurements
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'measurements' AND column_name = 'sdk_version')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_name = 'measurements' AND column_name = 'os_version') THEN
    ALTER TABLE "measurements" RENAME COLUMN "sdk_version" TO "os_version";
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name = 'measurements' AND column_name = 'sdk_version')
        AND EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'measurements' AND column_name = 'os_version') THEN
    ALTER TABLE "measurements" DROP COLUMN "sdk_version";
  ELSE
    ALTER TABLE "measurements" ADD COLUMN IF NOT EXISTS "os_version" TEXT;
  END IF;

  -- measurements_failed
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'measurements_failed' AND column_name = 'sdk_version')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_name = 'measurements_failed' AND column_name = 'os_version') THEN
    ALTER TABLE "measurements_failed" RENAME COLUMN "sdk_version" TO "os_version";
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name = 'measurements_failed' AND column_name = 'sdk_version')
        AND EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'measurements_failed' AND column_name = 'os_version') THEN
    ALTER TABLE "measurements_failed" DROP COLUMN "sdk_version";
  ELSE
    ALTER TABLE "measurements_failed" ADD COLUMN IF NOT EXISTS "os_version" TEXT;
  END IF;
END $$;
