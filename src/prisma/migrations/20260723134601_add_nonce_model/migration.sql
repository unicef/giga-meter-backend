-- CreateTable
CREATE TABLE "nonces" (
    "original_nonce" TEXT NOT NULL,
    "hash_id" TEXT NOT NULL,
    "used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nonces_pkey" PRIMARY KEY ("original_nonce")
);

-- CreateIndex
CREATE INDEX "nonces_expires_at_idx" ON "nonces"("expires_at");
