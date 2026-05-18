-- AlterTable
ALTER TABLE "measurements" ADD COLUMN "protocol" VARCHAR(32) NOT NULL DEFAULT 'mlab';
ALTER TABLE "measurements" ADD COLUMN "download_latency" DOUBLE PRECISION;
ALTER TABLE "measurements" ADD COLUMN "upload_latency" DOUBLE PRECISION;
ALTER TABLE "measurements" ADD COLUMN "download_jitter" DOUBLE PRECISION;
ALTER TABLE "measurements" ADD COLUMN "upload_jitter" DOUBLE PRECISION;
ALTER TABLE "measurements" ADD COLUMN "jitter" DOUBLE PRECISION;
ALTER TABLE "measurements" ADD COLUMN "packet_loss" DOUBLE PRECISION;
ALTER TABLE "measurements" ADD COLUMN "network_quality_score" DOUBLE PRECISION;

-- Backfill existing rows
UPDATE "measurements" SET "protocol" = 'mlab' WHERE "protocol" IS NULL;

-- CreateIndex
CREATE INDEX "measurements_protocol_idx" ON "measurements"("protocol");
