-- AlterTable
ALTER TABLE "country_facility_type_whitelist" RENAME CONSTRAINT "country_entity_type_whitelist_pkey" TO "country_facility_type_whitelist_pkey";

-- AlterTable
ALTER TABLE "facility_type" RENAME CONSTRAINT "entity_type_pkey" TO "facility_type_pkey";

-- RenameIndex
ALTER INDEX "country_facility_type_whitelist_country_code_facility_type_id_k" RENAME TO "country_facility_type_whitelist_country_code_facility_type__key";
