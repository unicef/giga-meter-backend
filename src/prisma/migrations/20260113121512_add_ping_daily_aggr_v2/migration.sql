-- AlterTable
ALTER TABLE "connectivity_ping_checks" ADD COLUMN     "deleted_at" TIMESTAMPTZ(6),
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false;
