-- CreateTable
CREATE TABLE "connectivity_ping_checks_daily_aggr" (
    "id" SERIAL NOT NULL,
    "timestamp_date" TIMESTAMP(3) NOT NULL,
    "giga_id_school" TEXT NOT NULL,
    "browser_id" TEXT,
    "is_connected_true" INTEGER NOT NULL,
    "is_connected_all" INTEGER NOT NULL,
    "uptime" DOUBLE PRECISION NOT NULL,
    "unloaded_latency_avg" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "connectivity_ping_checks_daily_aggr_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "connectivity_ping_checks_daily_aggr_giga_id_school_timestam_idx" ON "connectivity_ping_checks_daily_aggr"("giga_id_school", "timestamp_date");
CREATE INDEX "connectivity_ping_checks_daily_aggr_giga_id_school_browser_idx" ON "connectivity_ping_checks_daily_aggr"("giga_id_school", "browser_id", "timestamp_date");
