-- CreateTable
CREATE TABLE "connectivity_ping_checks" (
    "id" SERIAL NOT NULL,
    "timestamp" TIMESTAMPTZ(6),
    "is_connected" BOOLEAN,
    "error_message" TEXT,
    "giga_id_school" TEXT NOT NULL,
    "app_local_uuid" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text),

    CONSTRAINT "connectivity_ping_checks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "connectivity_ping_checks_app_local_uuid_key" ON "connectivity_ping_checks"("app_local_uuid");
