-- DropForeignKey
ALTER TABLE "school" DROP CONSTRAINT "school_country_code_fkey";

-- AlterTable
ALTER TABLE "school" ALTER COLUMN "country_code" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "school" ADD CONSTRAINT "school_country_code_fkey" FOREIGN KEY ("country_code") REFERENCES "country"("code") ON DELETE SET NULL ON UPDATE CASCADE;
