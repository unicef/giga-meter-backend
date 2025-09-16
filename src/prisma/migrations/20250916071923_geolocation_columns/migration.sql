-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- AlterTable
ALTER TABLE "dailycheckapp_school" ADD COLUMN     "detected_location_accuracy" DOUBLE PRECISION,
ADD COLUMN     "detected_location_distance" DOUBLE PRECISION,
ADD COLUMN     "detected_location_is_flagged" BOOLEAN DEFAULT false,
ADD COLUMN     "location_coordinates" geography(Point, 4326);

-- AlterTable
ALTER TABLE "measurements" ADD COLUMN     "detected_coordinates" geography(Point, 4326),
ADD COLUMN     "detected_location_accuracy" DOUBLE PRECISION,
ADD COLUMN     "detected_location_distance" DOUBLE PRECISION,
ADD COLUMN     "detected_location_is_flagged" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "measurements_failed" ADD COLUMN     "detected_coordinates" geography(Point, 4326),
ADD COLUMN     "detected_location_accuracy" DOUBLE PRECISION,
ADD COLUMN     "detected_location_distance" DOUBLE PRECISION,
ADD COLUMN     "detected_location_is_flagged" BOOLEAN DEFAULT false;
