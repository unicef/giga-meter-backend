/*
  Warnings:

  - You are about to alter the column `geopoint` on the `school` table. The data in that column could be lost. The data in that column will be cast from `VarChar` to `Unsupported("geography(Point, 4326)")`.

*/
-- AlterTable

UPDATE "school" SET "geopoint" = NULL;

ALTER TABLE "school"ALTER COLUMN "geopoint" SET DATA TYPE geography(Point, 4326)
USING NULL;