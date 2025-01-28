-- CreateTable
CREATE TABLE "master_sync_intermediate" (
    "id" SERIAL NOT NULL,
    "created" TIMESTAMPTZ NOT NULL,
    "modified" TIMESTAMPTZ NOT NULL,
    "school_id_giga" VARCHAR(50) NOT NULL,
    "school_id_govt" VARCHAR(255),
    "school_name" VARCHAR(1000) NOT NULL,
    "admin1" VARCHAR(255),
    "admin1_id_giga" VARCHAR(50),
    "admin2" VARCHAR(255),
    "admin2_id_giga" VARCHAR(50),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "education_level" VARCHAR(255),
    "school_area_type" VARCHAR(255),
    "school_funding_type" VARCHAR(255),
    "school_establishment_year" SMALLINT,
    "download_speed_contracted" DOUBLE PRECISION,
    "num_computers_desired" INTEGER,
    "electricity_type" VARCHAR(255),
    "num_adm_personnel" INTEGER,
    "num_students" INTEGER,
    "num_teachers" INTEGER,
    "num_classrooms" INTEGER,
    "num_latrines" INTEGER,
    "water_availability" VARCHAR(255),
    "electricity_availability" VARCHAR(255),
    "computer_lab" VARCHAR(255),
    "num_computers" INTEGER,
    "connectivity_govt" VARCHAR(255),
    "connectivity_type_govt" VARCHAR(255),
    "cellular_coverage_availability" VARCHAR(255),
    "cellular_coverage_type" VARCHAR(255),
    "connectivity_type" VARCHAR(255),
    "connectivity_type_root" VARCHAR(255),
    "fiber_node_distance" DOUBLE PRECISION,
    "microwave_node_distance" DOUBLE PRECISION,
    "schools_within_1km" INTEGER,
    "schools_within_2km" INTEGER,
    "schools_within_3km" INTEGER,
    "nearest_LTE_distance" DOUBLE PRECISION,
    "nearest_UMTS_distance" DOUBLE PRECISION,
    "nearest_GSM_distance" DOUBLE PRECISION,
    "nearest_NR_distance" DOUBLE PRECISION,
    "pop_within_1km" INTEGER,
    "pop_within_2km" INTEGER,
    "pop_within_3km" INTEGER,
    "school_data_source" VARCHAR(255),
    "school_data_collection_year" SMALLINT,
    "school_data_collection_modality" VARCHAR(255),
    "school_location_ingestion_timestamp" TIMESTAMPTZ,
    "connectivity_govt_ingestion_timestamp" TIMESTAMPTZ,
    "connectivity_govt_collection_year" SMALLINT,
    "disputed_region" VARCHAR(255),
    "connectivity_RT" VARCHAR(255),
    "connectivity_RT_datasource" VARCHAR(255),
    "connectivity_RT_ingestion_timestamp" TIMESTAMPTZ,
    "download_speed_benchmark" DOUBLE PRECISION,
    "computer_availability" VARCHAR(255),
    "num_students_girls" INTEGER,
    "num_students_boys" INTEGER,
    "num_students_other" INTEGER,
    "num_teachers_female" INTEGER,
    "num_teachers_male" INTEGER,
    "teachers_trained" VARCHAR(255),
    "sustainable_business_model" VARCHAR(255),
    "device_availability" VARCHAR(255),
    "num_tablets" INTEGER,
    "num_robotic_equipment" INTEGER,
    "building_id_govt" VARCHAR(255),
    "num_schools_per_building" INTEGER,
    "connectivity" VARCHAR(255),
    "version" INTEGER,
    "status" VARCHAR(50) NOT NULL,
    "country_id" BIGINT,

    CONSTRAINT "master_sync_intermediate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "master_sync_intermediate_country_id_5341dc42" ON "master_sync_intermediate"("country_id");

-- CreateIndex
CREATE INDEX "master_sync_intermediate_school_id_giga_a164dbb6" ON "master_sync_intermediate"("school_id_giga");

-- CreateIndex
CREATE INDEX "master_sync_intermediate_school_id_govt_ab3b376c" ON "master_sync_intermediate"("school_id_govt");

-- CreateIndex
CREATE INDEX "master_sync_intermediate_status_a2e65bb9" ON "master_sync_intermediate"("status");

-- AddForeignKey
ALTER TABLE "master_sync_intermediate" ADD CONSTRAINT "master_sync_intermediate_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country"("id") ON DELETE SET NULL ON UPDATE CASCADE;
