-- CreateEnum
CREATE TYPE "MeasurementProvider" AS ENUM ('mlab', 'cloudflare');

-- CreateTable
CREATE TABLE "country_config" (
    "id" SERIAL NOT NULL,
    "country_code" TEXT NOT NULL,
    "measurement_provider" "MeasurementProvider" NOT NULL DEFAULT 'mlab',
    "options" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "country_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "country_config_country_code_key" ON "country_config"("country_code");

-- AddForeignKey
ALTER TABLE "country_config" ADD CONSTRAINT "country_config_country_code_fkey" FOREIGN KEY ("country_code") REFERENCES "country"("code") ON DELETE CASCADE ON UPDATE CASCADE;
