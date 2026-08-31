-- AlterTable
ALTER TABLE "dailycheckapp_school" ADD COLUMN     "installed_path" TEXT,
ADD COLUMN     "wifi_connections" JSONB,
ADD COLUMN     "windows_username" TEXT;

-- AlterTable
ALTER TABLE "measurements" ADD COLUMN     "installed_path" TEXT,
ADD COLUMN     "wifi_connections" JSONB,
ADD COLUMN     "windows_username" TEXT;
