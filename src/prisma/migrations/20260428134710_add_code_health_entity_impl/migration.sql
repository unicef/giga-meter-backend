/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `entity_type` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `entity_type` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "entity_type" ADD COLUMN     "code" VARCHAR NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "entity_type_code_key" ON "entity_type"("code");
