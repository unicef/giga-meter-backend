-- AlterTable
-- Rows cached before this migration have no fetch date. Backdate them one month
-- so the first lookup after the deploy refreshes them from IPInfo.
ALTER TABLE "IpMetadata" ADD COLUMN     "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (CURRENT_TIMESTAMP - INTERVAL '1 month'),
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (CURRENT_TIMESTAMP - INTERVAL '1 month');

-- New rows are stamped with the insert time.
ALTER TABLE "IpMetadata" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
