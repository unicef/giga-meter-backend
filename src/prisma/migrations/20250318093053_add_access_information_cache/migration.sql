-- CreateTable
CREATE TABLE "AccessInformation" (
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

    CONSTRAINT "AccessInformation_pkey" PRIMARY KEY ("ip")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccessInformation_ip_key" ON "AccessInformation"("ip");
