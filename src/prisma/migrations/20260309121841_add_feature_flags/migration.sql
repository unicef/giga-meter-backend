-- CreateEnum
CREATE TYPE "FeatureFlagType" AS ENUM ('BOOLEAN', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "FeatureFlagScope" AS ENUM ('COUNTRY', 'SCHOOL');

-- CreateTable
CREATE TABLE "feature_flag" (
    "id" UUID NOT NULL,
    "key" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "flag_type" "FeatureFlagType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "percentage" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "feature_flag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flag_override" (
    "id" UUID NOT NULL,
    "feature_flag_id" UUID NOT NULL,
    "scope" "FeatureFlagScope" NOT NULL,
    "scope_id" VARCHAR(255) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "feature_flag_override_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "feature_flag_key_key" ON "feature_flag"("key");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flag_override_feature_flag_id_scope_scope_id_key" ON "feature_flag_override"("feature_flag_id", "scope", "scope_id");

-- AddForeignKey
ALTER TABLE "feature_flag_override" ADD CONSTRAINT "feature_flag_override_feature_flag_id_fkey" FOREIGN KEY ("feature_flag_id") REFERENCES "feature_flag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
