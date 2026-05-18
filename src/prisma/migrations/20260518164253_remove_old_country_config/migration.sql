
-- DropForeignKey
ALTER TABLE "country_config" DROP CONSTRAINT "country_config_country_code_fkey";

-- AlterTable
ALTER TABLE "country_protocol_config" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "school_protocol_config" ALTER COLUMN "updated_at" DROP DEFAULT;

-- DropTable
DROP TABLE "country_config";

-- DropEnum
DROP TYPE "MeasurementProvider";

-- RenameIndex
ALTER INDEX "connectivity_ping_checks_daily_aggr_giga_id_school_browser_idx" RENAME TO "connectivity_ping_checks_daily_aggr_giga_id_school_browser__idx";
