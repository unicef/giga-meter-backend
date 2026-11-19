-- Health facilities: facility types, health master data, v2 registrations,
-- per-country facility whitelist, and the facility columns on measurements
-- and connectivity checks.
--
-- Every statement is guarded so the migration is a no-op for anything that
-- already exists (tables, columns, indexes, constraints, seed rows). It can
-- run on a database that already has some or all of this schema.
--
-- measurements and connectivity_ping_checks are large on production. This file
-- runs in one transaction, so it only does cheap work on them: nullable
-- columns, DROP NOT NULL and NOT VALID foreign keys (all metadata changes).
-- Their indexes are meant to be built beforehand with CREATE INDEX
-- CONCURRENTLY (src/prisma/scripts/pre-deploy-health-indexes.sql); the
-- IF NOT EXISTS lines below then skip them, and still create them on fresh
-- and dev databases.

-- Fail fast instead of queueing behind a long-running query on these tables.
SET lock_timeout = '5s';

-- AlterTable
ALTER TABLE "country" ADD COLUMN IF NOT EXISTS "latest_health_master_data_version" INTEGER;

-- AlterTable
ALTER TABLE "measurements" ADD COLUMN IF NOT EXISTS "facility_type_id" INTEGER;
ALTER TABLE "measurements" ADD COLUMN IF NOT EXISTS "giga_id_health" TEXT;
ALTER TABLE "measurements" ADD COLUMN IF NOT EXISTS "registration_id" BIGINT;
ALTER TABLE "measurements" ALTER COLUMN "school_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "connectivity_ping_checks" ADD COLUMN IF NOT EXISTS "facility_type_id" INTEGER;
ALTER TABLE "connectivity_ping_checks" ADD COLUMN IF NOT EXISTS "giga_id_health" TEXT;
ALTER TABLE "connectivity_ping_checks" ADD COLUMN IF NOT EXISTS "registration_id" BIGINT;
ALTER TABLE "connectivity_ping_checks" ALTER COLUMN "giga_id_school" DROP NOT NULL;

-- CreateTable
CREATE TABLE IF NOT EXISTS "facility_type" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR NOT NULL,
    "code" VARCHAR NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text),

    CONSTRAINT "facility_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "health" (
    "id" BIGSERIAL NOT NULL,
    "created" TIMESTAMPTZ(6),
    "modified" TIMESTAMPTZ(6),
    "health_id_giga" VARCHAR NOT NULL,
    "facility_name" VARCHAR NOT NULL,
    "facility_data_source" VARCHAR NOT NULL,
    "signature" VARCHAR NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "dhis2_id" VARCHAR,
    "hims_id" VARCHAR,
    "hfml_id" VARCHAR,
    "facility_type_govt" VARCHAR,
    "facility_ownership_govt" VARCHAR,
    "facility_level" VARCHAR,
    "facility_accessibility" VARCHAR,
    "is_facility_open" BOOLEAN,
    "health_service_provider" VARCHAR,
    "facility_data_collection_year" INTEGER,
    "admin1" VARCHAR,
    "admin2" VARCHAR,
    "admin3" VARCHAR,
    "admin4" VARCHAR,
    "admin1_id_giga" VARCHAR,
    "admin2_id_giga" VARCHAR,
    "area_type_govt" VARCHAR,
    "distance_to_closest_settlement" DOUBLE PRECISION,
    "distance_to_country_boundary" DOUBLE PRECISION,
    "connectivity" VARCHAR,
    "connectivity_type" VARCHAR,
    "connectivity_govt" VARCHAR,
    "connectivity_govt_collection_year" INTEGER,
    "connectivity_catchment_coverage" VARCHAR,
    "electricity_availability" VARCHAR,
    "electricity_type" VARCHAR,
    "electricity_availability_hours" DOUBLE PRECISION,
    "power_backup_system" VARCHAR,
    "hmis_system" VARCHAR,
    "hmis_system_use" VARCHAR,
    "ers_system" VARCHAR,
    "ers_system_use" VARCHAR,
    "computer_availability" VARCHAR,
    "device_availability" VARCHAR,
    "tablets_availability" VARCHAR,
    "num_staff" INTEGER,
    "num_community_health_workers" INTEGER,
    "num_community_health_workers_within_5km" INTEGER,
    "pop_est_govt" INTEGER,
    "pop_est_hf" INTEGER,
    "pop_within_1km" INTEGER,
    "pop_within_3km" INTEGER,
    "pop_within_5km" INTEGER,
    "pop_within_10km" INTEGER,
    "country_code" VARCHAR,
    "created_at" TIMESTAMPTZ(6) DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text),
    "deleted" TIMESTAMPTZ(6),
    "last_health_static_id" INTEGER,

    CONSTRAINT "health_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "registration" (
    "id" BIGSERIAL NOT NULL,
    "facility_type_id" INTEGER NOT NULL,
    "installation_id" TEXT,
    "school_id" BIGINT,
    "health_id" BIGINT,
    "giga_id_school" TEXT,
    "giga_id_health" TEXT,
    "user_id" TEXT,
    "mac_address" TEXT,
    "os" TEXT,
    "app_version" TEXT,
    "created" TEXT,
    "network_information" VARCHAR,
    "ip_address" TEXT,
    "country_code" TEXT,
    "is_blocked" BOOLEAN NOT NULL DEFAULT false,
    "notify" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text),
    "device_hardware_id" TEXT,
    "is_active" BOOLEAN,
    "windows_username" TEXT,
    "installed_path" TEXT,
    "wifi_connections" JSONB,

    CONSTRAINT "registration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "country_facility_type_whitelist" (
    "id" SERIAL NOT NULL,
    "country_code" VARCHAR NOT NULL,
    "facility_type_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text),

    CONSTRAINT "country_facility_type_whitelist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "master_sync_health_static" (
    "id" SERIAL NOT NULL,
    "created" TIMESTAMPTZ NOT NULL,
    "modified" TIMESTAMPTZ NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "admin1_id_giga" VARCHAR(50),
    "admin2_id_giga" VARCHAR(50),
    "facility_data_collection_year" INTEGER,
    "facility_data_source" VARCHAR(255),
    "facility_type_govt" VARCHAR(255),
    "facility_ownership_govt" VARCHAR(255),
    "facility_level" VARCHAR(255),
    "facility_accessibility" VARCHAR(255),
    "is_facility_open" BOOLEAN,
    "health_service_provider" VARCHAR(255),
    "area_type_govt" VARCHAR(255),
    "distance_to_closest_settlement" DOUBLE PRECISION,
    "distance_to_country_boundary" DOUBLE PRECISION,
    "connectivity" BOOLEAN,
    "connectivity_type" VARCHAR(255),
    "connectivity_govt" BOOLEAN,
    "connectivity_govt_collection_year" INTEGER,
    "connectivity_catchment_coverage" VARCHAR(255),
    "electricity_availability" BOOLEAN,
    "electricity_type" VARCHAR(255),
    "electricity_availability_hours" DOUBLE PRECISION,
    "power_backup_system" VARCHAR(255),
    "hmis_system" VARCHAR(255),
    "hmis_system_use" VARCHAR(255),
    "ers_system" VARCHAR(255),
    "ers_system_use" VARCHAR(255),
    "computer_availability" BOOLEAN,
    "device_availability" BOOLEAN,
    "tablets_availability" BOOLEAN,
    "num_staff" INTEGER,
    "num_community_health_workers" INTEGER,
    "num_community_health_workers_within_5km" INTEGER,
    "pop_est_govt" INTEGER,
    "pop_est_hf" INTEGER,
    "pop_within_1km" INTEGER,
    "pop_within_3km" INTEGER,
    "pop_within_5km" INTEGER,
    "pop_within_10km" INTEGER,
    "version" INTEGER,
    "health_id" BIGINT,

    CONSTRAINT "master_sync_health_static_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "master_sync_intermediate_health" (
    "id" SERIAL NOT NULL,
    "created" TIMESTAMPTZ NOT NULL,
    "modified" TIMESTAMPTZ NOT NULL,
    "health_id_giga" VARCHAR(50) NOT NULL,
    "health_id_govt" VARCHAR(255),
    "facility_name" VARCHAR(1000) NOT NULL,
    "admin1" VARCHAR(255),
    "admin1_id_giga" VARCHAR(50),
    "admin2" VARCHAR(255),
    "admin2_id_giga" VARCHAR(50),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "facility_data_collection_year" SMALLINT,
    "facility_data_source" VARCHAR(255),
    "facility_type_govt" VARCHAR(255),
    "facility_ownership_govt" VARCHAR(255),
    "facility_level" VARCHAR(255),
    "facility_accessibility" VARCHAR(255),
    "is_facility_open" VARCHAR(255),
    "health_service_provider" VARCHAR(255),
    "area_type_govt" VARCHAR(255),
    "distance_to_closest_settlement" DOUBLE PRECISION,
    "distance_to_country_boundary" DOUBLE PRECISION,
    "connectivity" VARCHAR(255),
    "connectivity_type" VARCHAR(255),
    "connectivity_govt" VARCHAR(255),
    "connectivity_govt_collection_year" SMALLINT,
    "connectivity_catchment_coverage" VARCHAR(255),
    "electricity_availability" VARCHAR(255),
    "electricity_type" VARCHAR(255),
    "electricity_availability_hours" DOUBLE PRECISION,
    "power_backup_system" VARCHAR(255),
    "hmis_system" VARCHAR(255),
    "hmis_system_use" VARCHAR(255),
    "ers_system" VARCHAR(255),
    "ers_system_use" VARCHAR(255),
    "computer_availability" VARCHAR(255),
    "device_availability" VARCHAR(255),
    "tablets_availability" VARCHAR(255),
    "num_staff" INTEGER,
    "num_community_health_workers" INTEGER,
    "num_community_health_workers_within_5km" INTEGER,
    "pop_est_govt" INTEGER,
    "pop_est_hf" INTEGER,
    "pop_within_1km" INTEGER,
    "pop_within_3km" INTEGER,
    "pop_within_5km" INTEGER,
    "pop_within_10km" INTEGER,
    "version" INTEGER,
    "status" VARCHAR(50) NOT NULL,
    "country_id" BIGINT,

    CONSTRAINT "master_sync_intermediate_health_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "facility_type_name_key" ON "facility_type"("name");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "facility_type_code_key" ON "facility_type"("code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "health_country_code_idx" ON "health"("country_code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "health_health_id_giga_idx" ON "health"("health_id_giga");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "health_deleted_idx" ON "health"("deleted");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "health_last_health_static_id_idx" ON "health"("last_health_static_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "registration_facility_type_id_idx" ON "registration"("facility_type_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "registration_school_id_idx" ON "registration"("school_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "registration_health_id_idx" ON "registration"("health_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "registration_installation_id_idx" ON "registration"("installation_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "registration_device_hardware_id_idx" ON "registration"("device_hardware_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "registration_country_code_idx" ON "registration"("country_code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "country_facility_type_whitelist_facility_type_id_idx" ON "country_facility_type_whitelist"("facility_type_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "country_facility_type_whitelist_country_code_facility_type__key" ON "country_facility_type_whitelist"("country_code", "facility_type_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "master_sync_health_static_health_id" ON "master_sync_health_static"("health_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "master_sync_intermediate_health_country_id" ON "master_sync_intermediate_health"("country_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "master_sync_intermediate_health_health_id_giga" ON "master_sync_intermediate_health"("health_id_giga");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "master_sync_intermediate_health_health_id_govt" ON "master_sync_intermediate_health"("health_id_govt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "master_sync_intermediate_health_status" ON "master_sync_intermediate_health"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "measurements_registration_id_idx" ON "measurements"("registration_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "measurements_giga_id_health_idx" ON "measurements"("giga_id_health");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "connectivity_ping_checks_registration_id_idx" ON "connectivity_ping_checks"("registration_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "connectivity_ping_checks_giga_id_health_idx" ON "connectivity_ping_checks"("giga_id_health");

-- AddForeignKey
-- NOT VALID on the two large tables: every existing row is NULL in these
-- columns, and new writes are still checked. Validate later with
-- ALTER TABLE ... VALIDATE CONSTRAINT, which does not block reads or writes.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'measurements_facility_type_id_fkey') THEN
    ALTER TABLE "measurements" ADD CONSTRAINT "measurements_facility_type_id_fkey" FOREIGN KEY ("facility_type_id") REFERENCES "facility_type"("id") ON DELETE SET NULL ON UPDATE CASCADE NOT VALID;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'measurements_registration_id_fkey') THEN
    ALTER TABLE "measurements" ADD CONSTRAINT "measurements_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registration"("id") ON DELETE SET NULL ON UPDATE CASCADE NOT VALID;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'connectivity_ping_checks_facility_type_id_fkey') THEN
    ALTER TABLE "connectivity_ping_checks" ADD CONSTRAINT "connectivity_ping_checks_facility_type_id_fkey" FOREIGN KEY ("facility_type_id") REFERENCES "facility_type"("id") ON DELETE SET NULL ON UPDATE CASCADE NOT VALID;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'connectivity_ping_checks_registration_id_fkey') THEN
    ALTER TABLE "connectivity_ping_checks" ADD CONSTRAINT "connectivity_ping_checks_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registration"("id") ON DELETE SET NULL ON UPDATE CASCADE NOT VALID;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'health_country_code_fkey') THEN
    ALTER TABLE "health" ADD CONSTRAINT "health_country_code_fkey" FOREIGN KEY ("country_code") REFERENCES "country"("code") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'health_last_health_static_id_fkey') THEN
    ALTER TABLE "health" ADD CONSTRAINT "health_last_health_static_id_fkey" FOREIGN KEY ("last_health_static_id") REFERENCES "master_sync_health_static"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'registration_facility_type_id_fkey') THEN
    ALTER TABLE "registration" ADD CONSTRAINT "registration_facility_type_id_fkey" FOREIGN KEY ("facility_type_id") REFERENCES "facility_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'registration_school_id_fkey') THEN
    ALTER TABLE "registration" ADD CONSTRAINT "registration_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'registration_health_id_fkey') THEN
    ALTER TABLE "registration" ADD CONSTRAINT "registration_health_id_fkey" FOREIGN KEY ("health_id") REFERENCES "health"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'country_facility_type_whitelist_country_code_fkey') THEN
    ALTER TABLE "country_facility_type_whitelist" ADD CONSTRAINT "country_facility_type_whitelist_country_code_fkey" FOREIGN KEY ("country_code") REFERENCES "country"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'country_facility_type_whitelist_facility_type_id_fkey') THEN
    ALTER TABLE "country_facility_type_whitelist" ADD CONSTRAINT "country_facility_type_whitelist_facility_type_id_fkey" FOREIGN KEY ("facility_type_id") REFERENCES "facility_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'master_sync_health_static_health_id_fkey') THEN
    ALTER TABLE "master_sync_health_static" ADD CONSTRAINT "master_sync_health_static_health_id_fkey" FOREIGN KEY ("health_id") REFERENCES "health"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'master_sync_intermediate_health_country_id_fkey') THEN
    ALTER TABLE "master_sync_intermediate_health" ADD CONSTRAINT "master_sync_intermediate_health_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Seed facility types. Older seeds used the codes 'SCHL'/'HLTH'; the API keys
-- on 'school'/'health', so normalise those rows before inserting.
-- Skipped when the normalised row already exists, which would violate
-- facility_type_code_key.
UPDATE "facility_type" SET "code" = 'school'
WHERE "code" = 'SCHL'
  AND NOT EXISTS (SELECT 1 FROM "facility_type" WHERE "code" = 'school');
UPDATE "facility_type" SET "code" = 'health'
WHERE "code" = 'HLTH'
  AND NOT EXISTS (SELECT 1 FROM "facility_type" WHERE "code" = 'health');

INSERT INTO "facility_type" ("name", "code")
VALUES ('school', 'school'), ('health', 'health')
ON CONFLICT DO NOTHING;
