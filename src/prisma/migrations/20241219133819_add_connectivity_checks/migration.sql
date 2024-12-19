-- CreateTable
CREATE TABLE "connectivity_ping_checks" (
    "id" SERIAL NOT NULL,
    "timestamp" TIMESTAMPTZ(6),
    "is_connected" BOOLEAN,
    "response_time" BIGINT,
    "target_host" TEXT,
    "packet_sent" BIGINT,
    "packet_received" BIGINT,
    "error_message" TEXT,
    "giga_id_school" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text),

    CONSTRAINT "PK_connectivity_ping_checks" PRIMARY KEY ("id")
);
