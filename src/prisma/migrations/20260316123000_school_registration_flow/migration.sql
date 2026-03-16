ALTER TABLE "school"
ADD COLUMN "not_verified" BOOLEAN;

CREATE TABLE "school_new_registration" (
    "id" BIGSERIAL NOT NULL,
    "school_id" VARCHAR(256) NOT NULL,
    "school_name" VARCHAR(256) NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "address_line1" VARCHAR(256) NOT NULL,
    "address_line2" VARCHAR(256),
    "city" VARCHAR(128) NOT NULL,
    "state" VARCHAR(128) NOT NULL,
    "postal_code" VARCHAR(64) NOT NULL,
    "contact_name" VARCHAR(256) NOT NULL,
    "contact_email" VARCHAR(256) NOT NULL,
    "giga_id_school" VARCHAR(256) NOT NULL,
    "verification_status" VARCHAR(64),
    "verification_requested_at" TIMESTAMPTZ(6),
    "verification_error" TEXT,
    "created" TIMESTAMPTZ(6),
    "modified" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text),
    "deleted" TIMESTAMPTZ(6),

    CONSTRAINT "school_new_registration_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "school_new_registration_giga_id_school_idx"
ON "school_new_registration"("giga_id_school");

CREATE INDEX "school_new_registration_deleted_idx"
ON "school_new_registration"("deleted");

CREATE INDEX "school_new_registration_giga_id_school_deleted_idx"
ON "school_new_registration"("giga_id_school", "deleted");
