/*
  Warnings:

  - Added the required column `country_code` to the `school` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "school" ADD COLUMN     "country_code" VARCHAR NOT NULL;

-- CreateTable
CREATE TABLE "country" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR NOT NULL,
    "code" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text),

    CONSTRAINT "country_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "country_code_key" ON "country"("code");

-- CreateIndex
CREATE INDEX "school_country_code_idx" ON "school"("country_code");

-- AddForeignKey
ALTER TABLE "school" ADD CONSTRAINT "school_country_code_fkey" FOREIGN KEY ("country_code") REFERENCES "country"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
