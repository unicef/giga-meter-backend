-- AlterTable
ALTER TABLE "country" ALTER COLUMN "created_at" SET DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text);

-- AlterTable
ALTER TABLE "dailycheckapp_contact_contactmessage" ALTER COLUMN "created_at" SET DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text);

-- AlterTable
ALTER TABLE "dailycheckapp_country" ALTER COLUMN "created_at" SET DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text);

-- AlterTable
ALTER TABLE "dailycheckapp_flagged_school" ALTER COLUMN "created_at" SET DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text);

-- AlterTable
ALTER TABLE "dailycheckapp_school" ALTER COLUMN "created_at" SET DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text);

-- AlterTable
ALTER TABLE "giga_id_school_mapping_fix" ALTER COLUMN "created_at" SET DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text);

-- AlterTable
ALTER TABLE "measurements" ADD COLUMN     "data_downloaded" BIGINT,
ADD COLUMN     "data_uploaded" BIGINT,
ADD COLUMN     "data_usage" BIGINT,
ALTER COLUMN "created_at" SET DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text);

-- AlterTable
ALTER TABLE "measurements_failed" ADD COLUMN     "data_downloaded" BIGINT,
ADD COLUMN     "data_uploaded" BIGINT,
ADD COLUMN     "data_used" BIGINT,
ALTER COLUMN "created_at" SET DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text);

-- AlterTable
ALTER TABLE "school" ALTER COLUMN "created_at" SET DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text);
