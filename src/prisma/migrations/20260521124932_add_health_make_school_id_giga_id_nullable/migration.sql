-- AlterTable
ALTER TABLE "connectivity_ping_checks" ALTER COLUMN "giga_id_school" DROP NOT NULL;

-- AlterTable
ALTER TABLE "measurements" ALTER COLUMN "school_id" DROP NOT NULL;
