-- Rename entity_type discriminator tables/columns to facility_type

ALTER TABLE "entity_type" RENAME TO "facility_type";

ALTER TABLE "country_entity_type_whitelist" RENAME TO "country_facility_type_whitelist";
ALTER TABLE "country_facility_type_whitelist" RENAME COLUMN "entity_type_id" TO "facility_type_id";

ALTER TABLE "registration" RENAME COLUMN "entity_type_id" TO "facility_type_id";
ALTER TABLE "measurements" RENAME COLUMN "entity_type_id" TO "facility_type_id";
ALTER TABLE "connectivity_ping_checks" RENAME COLUMN "entity_type_id" TO "facility_type_id";

-- Rename indexes
ALTER INDEX IF EXISTS "entity_type_name_key" RENAME TO "facility_type_name_key";
ALTER INDEX IF EXISTS "entity_type_code_key" RENAME TO "facility_type_code_key";
ALTER INDEX IF EXISTS "registration_entity_type_id_idx" RENAME TO "registration_facility_type_id_idx";
ALTER INDEX IF EXISTS "measurements_entity_type_id_idx" RENAME TO "measurements_facility_type_id_idx";
ALTER INDEX IF EXISTS "connectivity_ping_checks_entity_type_id_idx" RENAME TO "connectivity_ping_checks_facility_type_id_idx";
ALTER INDEX IF EXISTS "country_entity_type_whitelist_entity_type_id_idx" RENAME TO "country_facility_type_whitelist_facility_type_id_idx";
ALTER INDEX IF EXISTS "country_entity_type_whitelist_country_code_entity_type_id_key" RENAME TO "country_facility_type_whitelist_country_code_facility_type_id_key";

-- Rename foreign key constraints
ALTER TABLE "registration" RENAME CONSTRAINT "registration_entity_type_id_fkey" TO "registration_facility_type_id_fkey";
ALTER TABLE "measurements" RENAME CONSTRAINT "measurements_entity_type_id_fkey" TO "measurements_facility_type_id_fkey";
ALTER TABLE "connectivity_ping_checks" RENAME CONSTRAINT "connectivity_ping_checks_entity_type_id_fkey" TO "connectivity_ping_checks_facility_type_id_fkey";
ALTER TABLE "country_facility_type_whitelist" RENAME CONSTRAINT "country_entity_type_whitelist_entity_type_id_fkey" TO "country_facility_type_whitelist_facility_type_id_fkey";
ALTER TABLE "country_facility_type_whitelist" RENAME CONSTRAINT "country_entity_type_whitelist_country_code_fkey" TO "country_facility_type_whitelist_country_code_fkey";
