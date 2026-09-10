-- AlterTable
ALTER TABLE "measurements" ADD COLUMN     "app_build_number" TEXT,
ADD COLUMN     "device_cpu" TEXT,
ADD COLUMN     "device_manufacturer" TEXT,
ADD COLUMN     "device_model" TEXT,
ADD COLUMN     "device_ram_mb" INTEGER,
ADD COLUMN     "device_storage_mb" INTEGER,
ADD COLUMN     "os_version" TEXT,
ADD COLUMN     "sdk_version" TEXT;

-- AlterTable
ALTER TABLE "measurements_failed" ADD COLUMN     "app_build_number" TEXT,
ADD COLUMN     "device_cpu" TEXT,
ADD COLUMN     "device_manufacturer" TEXT,
ADD COLUMN     "device_model" TEXT,
ADD COLUMN     "device_ram_mb" INTEGER,
ADD COLUMN     "device_storage_mb" INTEGER,
ADD COLUMN     "os_version" TEXT,
ADD COLUMN     "sdk_version" TEXT;
