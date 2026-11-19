-- Replace the "IpMetadata" cache with a snake_case "ip_metadata" table that
-- tracks when each record was fetched. The new table starts empty: every IP is
-- fetched from IPInfo again on its first lookup after the deploy.
--
-- Besides the fields the app gets back, it keeps the ISP, company and privacy
-- details IPInfo returns (VPN, proxy, Tor, relay, hosting) and the full
-- response in "raw". These are for our own analysis and are not sent to the app.
-- "last_seen_at" is when the IP was last looked up, written at most once a day,
-- so IPs no longer in use can be found and removed.
--
-- The old "IpMetadata" table is kept, untouched, as a backup. The code no
-- longer reads it, and instances still running the previous version keep
-- working while the deploy rolls out. Drop it in a later cleanup.

-- CreateTable
CREATE TABLE "ip_metadata" (
    "id" SERIAL NOT NULL,
    "ip" TEXT NOT NULL,
    "hostname" TEXT,
    "city" TEXT,
    "region" TEXT,
    "country" TEXT,
    "loc" TEXT,
    "org" TEXT,
    "postal" TEXT,
    "timezone" TEXT,
    "asn" TEXT,
    "source" TEXT,
    "asn_name" TEXT,
    "asn_type" TEXT,
    "asn_route" TEXT,
    "company_name" TEXT,
    "company_type" TEXT,
    "is_vpn" BOOLEAN,
    "is_proxy" BOOLEAN,
    "is_tor" BOOLEAN,
    "is_relay" BOOLEAN,
    "is_hosting" BOOLEAN,
    "raw" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retry_after" TIMESTAMPTZ(6),
    "last_seen_at" TIMESTAMPTZ(6),

    CONSTRAINT "ip_metadata_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ip_metadata_ip_source_key" ON "ip_metadata"("ip", "source");
