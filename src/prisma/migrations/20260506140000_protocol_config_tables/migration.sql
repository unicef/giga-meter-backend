-- CreateTable
CREATE TABLE "country_protocol_config" (
    "id" SERIAL NOT NULL,
    "country_code" VARCHAR NOT NULL,
    "measurement_provider" VARCHAR(32) NOT NULL,
    "between_tests_delay_sec" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "country_protocol_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_protocol_config" (
    "id" SERIAL NOT NULL,
    "giga_id_school" VARCHAR NOT NULL,
    "measurement_provider" VARCHAR(32),
    "between_tests_delay_sec" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "school_protocol_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "country_protocol_config_country_code_key" ON "country_protocol_config"("country_code");

-- CreateIndex
CREATE INDEX "country_protocol_config_country_code_idx" ON "country_protocol_config"("country_code");

-- CreateIndex
CREATE UNIQUE INDEX "school_protocol_config_giga_id_school_key" ON "school_protocol_config"("giga_id_school");

-- CreateIndex
CREATE INDEX "school_protocol_config_giga_id_school_idx" ON "school_protocol_config"("giga_id_school");

-- AddForeignKey
ALTER TABLE "country_protocol_config" ADD CONSTRAINT "country_protocol_config_country_code_fkey" FOREIGN KEY ("country_code") REFERENCES "country"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
