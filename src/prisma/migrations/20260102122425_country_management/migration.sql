-- CreateEnum
CREATE TYPE "SpeedTestProtocol" AS ENUM ('NDT7', 'CLOUDFLARE');

-- AlterTable
ALTER TABLE "country" ADD COLUMN     "speed_test_protocol" "SpeedTestProtocol" NOT NULL DEFAULT 'NDT7';
ALTER TABLE "country" ADD COLUMN     "is_active" BOOLEAN DEFAULT true;
