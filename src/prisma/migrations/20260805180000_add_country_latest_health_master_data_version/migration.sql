-- Health master sync watermark (parallel to latest_school_master_data_version).

ALTER TABLE "country"
ADD COLUMN "latest_health_master_data_version" INTEGER;
