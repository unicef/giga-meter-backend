/*
  Warnings:

  - You are about to drop the column `data_used` on the `measurements_failed` table. All the data in the column will be lost.

*/
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
ALTER TABLE "measurements" ALTER COLUMN "created_at" SET DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text);

-- AlterTable
ALTER TABLE "measurements_failed" DROP COLUMN "data_used",
ADD COLUMN     "data_usage" BIGINT,
ALTER COLUMN "created_at" SET DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text);

-- AlterTable
ALTER TABLE "school" ALTER COLUMN "created_at" SET DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text);
