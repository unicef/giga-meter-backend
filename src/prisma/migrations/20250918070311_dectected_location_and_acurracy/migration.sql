-- AlterTable
ALTER TABLE "dailycheckapp_school" ADD COLUMN     "detected_latitude" DOUBLE PRECISION,
ADD COLUMN     "detected_location_accuracy" DOUBLE PRECISION,
ADD COLUMN     "detected_location_distance" DOUBLE PRECISION,
ADD COLUMN     "detected_location_is_flagged" BOOLEAN DEFAULT false,
ADD COLUMN     "detected_longitude" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "measurements" ADD COLUMN     "detected_latitude" DOUBLE PRECISION,
ADD COLUMN     "detected_location_accuracy" DOUBLE PRECISION,
ADD COLUMN     "detected_location_distance" DOUBLE PRECISION,
ADD COLUMN     "detected_location_is_flagged" BOOLEAN DEFAULT false,
ADD COLUMN     "detected_longitude" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "measurements_failed" ADD COLUMN     "detected_latitude" DOUBLE PRECISION,
ADD COLUMN     "detected_location_accuracy" DOUBLE PRECISION,
ADD COLUMN     "detected_location_distance" DOUBLE PRECISION,
ADD COLUMN     "detected_location_is_flagged" BOOLEAN DEFAULT false,
ADD COLUMN     "detected_longitude" DOUBLE PRECISION;
