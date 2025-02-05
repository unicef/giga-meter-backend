/*
  Warnings:

  - Added the required column `device_id` to the `connectivity_ping_checks` table without a default value. This is not possible if the table is not empty.
  - Added the required column `uuid` to the `connectivity_ping_checks` table without a default value. This is not possible if the table is not empty.
  - Made the column `giga_id_school` on table `connectivity_ping_checks` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "connectivity_ping_checks" ADD COLUMN     "device_id" TEXT NOT NULL,
ADD COLUMN     "uuid" TEXT NOT NULL,
ALTER COLUMN "giga_id_school" SET NOT NULL;
