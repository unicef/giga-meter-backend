/*
  Warnings:

  - You are about to drop the column `data_used` on the `measurements_failed` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "measurements_failed" DROP COLUMN "data_used",
ADD COLUMN     "data_usage" BIGINT;
