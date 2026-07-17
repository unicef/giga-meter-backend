-- AlterTable
ALTER TABLE "connectivity_ping_checks" ADD COLUMN     "entity_type_id" INTEGER,
ADD COLUMN     "giga_id_health" TEXT,
ADD COLUMN     "registration_id" BIGINT;

-- AlterTable
ALTER TABLE "measurements" ADD COLUMN     "entity_type_id" INTEGER,
ADD COLUMN     "giga_id_health" TEXT,
ADD COLUMN     "registration_id" BIGINT;

-- CreateIndex
CREATE INDEX "connectivity_ping_checks_entity_type_id_idx" ON "connectivity_ping_checks"("entity_type_id");

-- CreateIndex
CREATE INDEX "connectivity_ping_checks_registration_id_idx" ON "connectivity_ping_checks"("registration_id");

-- CreateIndex
CREATE INDEX "connectivity_ping_checks_giga_id_health_idx" ON "connectivity_ping_checks"("giga_id_health");

-- CreateIndex
CREATE INDEX "measurements_entity_type_id_idx" ON "measurements"("entity_type_id");

-- CreateIndex
CREATE INDEX "measurements_registration_id_idx" ON "measurements"("registration_id");

-- CreateIndex
CREATE INDEX "measurements_giga_id_health_idx" ON "measurements"("giga_id_health");

-- AddForeignKey
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_entity_type_id_fkey" FOREIGN KEY ("entity_type_id") REFERENCES "entity_type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connectivity_ping_checks" ADD CONSTRAINT "connectivity_ping_checks_entity_type_id_fkey" FOREIGN KEY ("entity_type_id") REFERENCES "entity_type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connectivity_ping_checks" ADD CONSTRAINT "connectivity_ping_checks_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
-- IF EXISTS: this same rename also ships in 20260605114656 (staging branch); whichever
-- runs second must be a no-op, both on existing DBs and on fresh replays (shadow DB/CI).
ALTER INDEX IF EXISTS "connectivity_ping_checks_daily_aggr_giga_id_school_browser_idx" RENAME TO "connectivity_ping_checks_daily_aggr_giga_id_school_browser__idx";
