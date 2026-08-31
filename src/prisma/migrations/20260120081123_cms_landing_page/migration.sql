-- CreateTable
CREATE TABLE "cms_content" (
    "id" SERIAL NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "content_json" JSONB NOT NULL,
    "published_at" TIMESTAMP(3),
    "last_modified" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" INTEGER,
    "updated_by_id" INTEGER,

    CONSTRAINT "cms_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_media" (
    "id" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "alt_text" TEXT,
    "file_type" VARCHAR(100) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "file_path" TEXT NOT NULL,
    "url" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "duration" INTEGER,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "used_in_sections" TEXT[],
    "deleted_at" TIMESTAMP(3),
    "created_by_id" INTEGER,
    "updated_by_id" INTEGER,

    CONSTRAINT "cms_media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cms_content_status_key" ON "cms_content"("status");

-- CreateIndex
CREATE INDEX "cms_content_status_idx" ON "cms_content"("status");

-- CreateIndex
CREATE INDEX "cms_content_created_by_id_idx" ON "cms_content"("created_by_id");

-- CreateIndex
CREATE INDEX "cms_content_updated_by_id_idx" ON "cms_content"("updated_by_id");

-- CreateIndex
CREATE INDEX "cms_media_name_idx" ON "cms_media"("name");

-- CreateIndex
CREATE INDEX "cms_media_file_type_idx" ON "cms_media"("file_type");

-- CreateIndex
CREATE INDEX "cms_media_uploaded_at_idx" ON "cms_media"("uploaded_at");

-- CreateIndex
CREATE INDEX "cms_media_deleted_at_idx" ON "cms_media"("deleted_at");

-- CreateIndex
CREATE INDEX "cms_media_created_by_id_idx" ON "cms_media"("created_by_id");

-- CreateIndex
CREATE INDEX "cms_media_updated_by_id_idx" ON "cms_media"("updated_by_id");

-- AddForeignKey
ALTER TABLE "cms_content" ADD CONSTRAINT "cms_content_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_content" ADD CONSTRAINT "cms_content_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_media" ADD CONSTRAINT "cms_media_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_media" ADD CONSTRAINT "cms_media_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
