-- Per-health-facility protocol overrides, mirroring school_protocol_config.
-- `measurement_providers` is already an array here (school_protocol_config was
-- converted from a scalar column in 20260629120000).

-- CreateTable
CREATE TABLE "health_protocol_config" (
    "id" SERIAL NOT NULL,
    "giga_id_health" VARCHAR NOT NULL,
    "measurement_providers" VARCHAR(32)[],
    "between_tests_delay_sec" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "health_protocol_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "health_protocol_config_giga_id_health_key" ON "health_protocol_config"("giga_id_health");

-- CreateIndex
CREATE INDEX "health_protocol_config_giga_id_health_idx" ON "health_protocol_config"("giga_id_health");
