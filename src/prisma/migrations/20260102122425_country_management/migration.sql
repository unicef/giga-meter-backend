-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "SpeedTestProtocol" AS ENUM ('NDT7', 'CLOUDFLARE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "country" ADD COLUMN IF NOT EXISTS "speed_test_protocol" "SpeedTestProtocol" NOT NULL DEFAULT 'NDT7';
ALTER TABLE "country" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN DEFAULT true;
