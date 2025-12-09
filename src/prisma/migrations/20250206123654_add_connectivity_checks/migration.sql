-- CreateTable
CREATE TABLE IF NOT EXISTS "connectivity_ping_checks" (
    "id" SERIAL NOT NULL,
    "timestamp" TIMESTAMPTZ(6),
    "is_connected" BOOLEAN,
    "error_message" TEXT,
    "giga_id_school" TEXT NOT NULL,
    "app_local_uuid" TEXT NOT NULL,
    "browser_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text),

    CONSTRAINT "connectivity_ping_checks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- Create unique index if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS "connectivity_ping_checks_app_local_uuid_key" 
ON "connectivity_ping_checks"("app_local_uuid");