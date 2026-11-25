-- App instances: every registration, including the one the app makes by itself
-- on a PC that is already registered, is its own row, identified by an ID the
-- app generates. Older apps send none, so both columns are nullable and adding
-- them doesn't rewrite the table.
ALTER TABLE "dailycheckapp_school"
  ADD COLUMN IF NOT EXISTS "app_instance_id" TEXT,
  ADD COLUMN IF NOT EXISTS "registration_source" TEXT;

-- One row per app instance. NULLs don't collide, so older registrations are
-- unaffected. Every existing row is NULL, so this builds quickly at boot; on a
-- large table, create it beforehand with CREATE UNIQUE INDEX CONCURRENTLY and
-- this becomes a no-op.
CREATE UNIQUE INDEX IF NOT EXISTS "dailycheckapp_school_app_instance_id_key" ON "dailycheckapp_school"("app_instance_id");
