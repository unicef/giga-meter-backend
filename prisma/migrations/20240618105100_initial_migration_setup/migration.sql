-- CreateTable
CREATE TABLE "__EFMigrationsHistory" (
    "MigrationId" VARCHAR(150) NOT NULL,
    "ProductVersion" VARCHAR(32) NOT NULL,

    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

-- CreateTable
CREATE TABLE "dailycheckapp_contact_contactmessage" (
    "id" SERIAL NOT NULL,
    "created" TIMESTAMPTZ(6) NOT NULL,
    "modified" TIMESTAMPTZ(6) NOT NULL,
    "firstname" VARCHAR(256) NOT NULL,
    "lastname" VARCHAR(256) NOT NULL,
    "school_id" VARCHAR(256) NOT NULL,
    "email" VARCHAR(256) NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text),

    CONSTRAINT "dailycheckapp_contact_contactmessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dailycheckapp_country" (
    "id" BIGSERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT,
    "created" TEXT,
    "country_id" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text),
    "code_iso3" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "dailycheckapp_country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dailycheckapp_flagged_school" (
    "id" BIGSERIAL NOT NULL,
    "detected_country" TEXT,
    "selected_country" TEXT,
    "school_id" TEXT,
    "created" TEXT,
    "giga_id_school" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text),

    CONSTRAINT "dailycheckapp_flagged_school_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dailycheckapp_school" (
    "id" BIGSERIAL NOT NULL,
    "user_id" TEXT,
    "giga_id_school" TEXT,
    "mac_address" TEXT,
    "os" TEXT,
    "app_version" TEXT,
    "created" TEXT,
    "network_information" VARCHAR,
    "ip_address" TEXT,
    "country_code" TEXT,
    "is_blocked" BOOLEAN NOT NULL DEFAULT false,
    "notify" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text),

    CONSTRAINT "dailycheckapp_school_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "giga_id_school_mapping_fix" (
    "id" SERIAL NOT NULL,
    "giga_id_school_wrong" TEXT NOT NULL,
    "wrong_country" TEXT NOT NULL,
    "giga_id_school_correct" TEXT NOT NULL,
    "correct_country" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text),

    CONSTRAINT "PK_giga_id_school_mapping_fix" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "measurements" (
    "id" BIGSERIAL NOT NULL,
    "timestamp" TIMESTAMPTZ(6),
    "uuid" TEXT,
    "browser_id" TEXT,
    "school_id" TEXT NOT NULL,
    "device_type" TEXT,
    "notes" TEXT,
    "client_info" JSONB,
    "server_info" JSONB,
    "annotation" TEXT,
    "download" DOUBLE PRECISION,
    "upload" DOUBLE PRECISION,
    "latency" BIGINT,
    "results" JSONB,
    "giga_id_school" TEXT,
    "country_code" TEXT,
    "ip_address" TEXT,
    "app_version" TEXT,
    "source" TEXT NOT NULL DEFAULT 'MLab',
    "created_at" TIMESTAMPTZ(6) DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text),

    CONSTRAINT "PK_measurements" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "measurements_failed" (
    "id" BIGSERIAL NOT NULL,
    "timestamp" TIMESTAMPTZ(6),
    "uuid" TEXT,
    "browser_id" TEXT,
    "school_id" TEXT NOT NULL,
    "device_type" TEXT,
    "notes" TEXT,
    "client_info" JSONB,
    "server_info" JSONB,
    "annotation" TEXT,
    "download" DOUBLE PRECISION,
    "upload" DOUBLE PRECISION,
    "latency" BIGINT,
    "results" JSONB,
    "giga_id_school" TEXT,
    "country_code" TEXT,
    "ip_address" TEXT,
    "app_version" TEXT,
    "source" TEXT NOT NULL DEFAULT 'DailyCheckApp',
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text),

    CONSTRAINT "PK_measurements_failed" PRIMARY KEY ("id")
);
