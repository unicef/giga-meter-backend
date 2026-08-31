/*
  Warnings:

  - You are about to drop the column `device_cpu` on the `measurements` table. All the data in the column will be lost.
  - You are about to drop the column `device_ram_mb` on the `measurements` table. All the data in the column will be lost.
  - You are about to drop the column `device_storage_mb` on the `measurements` table. All the data in the column will be lost.
  - You are about to drop the column `sdk_version` on the `measurements` table. All the data in the column will be lost.
  - You are about to drop the column `device_cpu` on the `measurements_failed` table. All the data in the column will be lost.
  - You are about to drop the column `device_ram_mb` on the `measurements_failed` table. All the data in the column will be lost.
  - You are about to drop the column `device_storage_mb` on the `measurements_failed` table. All the data in the column will be lost.
  - You are about to drop the column `sdk_version` on the `measurements_failed` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "measurements" DROP COLUMN "device_cpu",
DROP COLUMN "device_ram_mb",
DROP COLUMN "device_storage_mb",
DROP COLUMN "sdk_version",
ADD COLUMN     "device_name" TEXT;

-- AlterTable
ALTER TABLE "measurements_failed" DROP COLUMN "device_cpu",
DROP COLUMN "device_ram_mb",
DROP COLUMN "device_storage_mb",
DROP COLUMN "sdk_version",
ADD COLUMN     "device_name" TEXT;
