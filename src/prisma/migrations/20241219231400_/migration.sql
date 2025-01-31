-- AlterTable
ALTER TABLE "country" ADD COLUMN     "iso3_format" VARCHAR(32),
ADD COLUMN     "latest_school_master_data_version" INTEGER;

-- AlterTable
ALTER TABLE "school" ADD COLUMN     "deleted" TIMESTAMPTZ(6),
ADD COLUMN     "last_school_static_id" INTEGER;

-- CreateTable
CREATE TABLE "master_sync_school_static" (
    "id" SERIAL NOT NULL,

    CONSTRAINT "master_sync_school_static_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "school_deleted_idx" ON "school"("deleted");

-- CreateIndex
CREATE INDEX "school_last_school_static_id_idx" ON "school"("last_school_static_id");

-- AddForeignKey
ALTER TABLE "school" ADD CONSTRAINT "school_last_school_static_id_fkey" FOREIGN KEY ("last_school_static_id") REFERENCES "master_sync_school_static"("id") ON DELETE SET NULL ON UPDATE CASCADE;
