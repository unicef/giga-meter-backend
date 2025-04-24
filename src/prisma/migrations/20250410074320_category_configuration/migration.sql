-- CreateTable
CREATE TABLE "category_config" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN DEFAULT false,
    "allowedAPIs" JSONB[],
    "notAllowedAPIs" JSONB[],
    "responseFilters" JSONB,
    "swagger" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "category_config_name_key" ON "category_config"("name");
