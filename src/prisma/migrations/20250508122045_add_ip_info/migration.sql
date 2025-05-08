-- CreateTable
CREATE TABLE "IpMetadata" (
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

    CONSTRAINT "IpMetadata_pkey" PRIMARY KEY ("ip")
);

-- CreateIndex
CREATE UNIQUE INDEX "IpMetadata_ip_key" ON "IpMetadata"("ip");
