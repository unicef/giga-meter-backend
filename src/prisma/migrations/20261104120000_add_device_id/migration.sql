-- Device ID (TECH-8828): the hardware values each registration was made with,
-- and the device ID the server gives one physical PC across its registrations.
-- Every column is nullable or has a constant default, so adding them doesn't
-- rewrite the table.
ALTER TABLE "dailycheckapp_school"
  ADD COLUMN IF NOT EXISTS "baseboard_serial" TEXT,
  ADD COLUMN IF NOT EXISTS "disk_serial" TEXT,
  ADD COLUMN IF NOT EXISTS "machine_guid" TEXT,
  ADD COLUMN IF NOT EXISTS "device_id" TEXT,
  ADD COLUMN IF NOT EXISTS "device_id_flags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Lookups by each hardware value, by device ID, and by user_id (the app's
-- browser_id). The table is small, so these build quickly at boot. On a large
-- table, create them beforehand with CREATE INDEX CONCURRENTLY and this
-- migration becomes a no-op.
CREATE INDEX IF NOT EXISTS "dailycheckapp_school_device_hardware_id_idx" ON "dailycheckapp_school"("device_hardware_id");
CREATE INDEX IF NOT EXISTS "dailycheckapp_school_baseboard_serial_idx" ON "dailycheckapp_school"("baseboard_serial");
CREATE INDEX IF NOT EXISTS "dailycheckapp_school_disk_serial_idx" ON "dailycheckapp_school"("disk_serial");
CREATE INDEX IF NOT EXISTS "dailycheckapp_school_machine_guid_idx" ON "dailycheckapp_school"("machine_guid");
CREATE INDEX IF NOT EXISTS "dailycheckapp_school_device_id_idx" ON "dailycheckapp_school"("device_id");
CREATE INDEX IF NOT EXISTS "dailycheckapp_school_user_id_idx" ON "dailycheckapp_school"("user_id");

-- The daily ping summary carries the device ID next to browser_id, so each PC
-- can be counted once.
ALTER TABLE "connectivity_ping_checks_daily_aggr" ADD COLUMN IF NOT EXISTS "device_id" TEXT;
