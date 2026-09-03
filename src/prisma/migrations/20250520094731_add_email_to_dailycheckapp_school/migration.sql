/*
  Warnings:

  - A unique constraint covering the columns `[mac_address]` on the table `dailycheckapp_school` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "dailycheckapp_school" ADD COLUMN     "email" TEXT[];

-- CreateIndex
CREATE UNIQUE INDEX "dailycheckapp_school_mac_address_key" ON "dailycheckapp_school"("mac_address");
