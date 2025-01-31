/*
  Warnings:

  - You are about to drop the column `packet_received` on the `connectivity_ping_checks` table. All the data in the column will be lost.
  - You are about to drop the column `packet_sent` on the `connectivity_ping_checks` table. All the data in the column will be lost.
  - You are about to drop the column `response_time` on the `connectivity_ping_checks` table. All the data in the column will be lost.
  - You are about to drop the column `target_host` on the `connectivity_ping_checks` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "connectivity_ping_checks" DROP COLUMN "packet_received",
DROP COLUMN "packet_sent",
DROP COLUMN "response_time",
DROP COLUMN "target_host";
