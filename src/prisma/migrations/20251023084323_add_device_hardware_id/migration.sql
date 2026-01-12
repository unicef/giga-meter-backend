-- AlterTable
ALTER TABLE "dailycheckapp_school" ADD COLUMN     "device_hardware_id" TEXT;

-- AlterTable
ALTER TABLE "measurements" ADD COLUMN     "device_hardware_id" TEXT;
