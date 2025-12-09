-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "user_name" TEXT,
    "last_login" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_superuser" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_auth_role" (
    "id" SERIAL NOT NULL,
    "deleted" TIMESTAMPTZ,
    "last_modified_at" TIMESTAMPTZ NOT NULL,
    "created" TIMESTAMPTZ NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" VARCHAR(255),
    "category" VARCHAR(50) NOT NULL,
    "created_by_id" INTEGER,
    "last_modified_by_id" INTEGER,

    CONSTRAINT "custom_auth_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_auth_rolepermission" (
    "id" SERIAL NOT NULL,
    "deleted" TIMESTAMPTZ,
    "last_modified_at" TIMESTAMPTZ NOT NULL,
    "created" TIMESTAMPTZ NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "created_by_id" INTEGER,
    "last_modified_by_id" INTEGER,
    "role_id" INTEGER NOT NULL,

    CONSTRAINT "custom_auth_rolepermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_auth_userrolerelationship" (
    "id" SERIAL NOT NULL,
    "deleted" TIMESTAMPTZ,
    "last_modified_at" TIMESTAMPTZ NOT NULL,
    "created" TIMESTAMPTZ NOT NULL,
    "created_by_id" INTEGER,
    "last_modified_by_id" INTEGER,
    "role_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "custom_auth_userrolerelationship_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "custom_auth_role_created_by_id_idx" ON "custom_auth_role"("created_by_id");

-- CreateIndex
CREATE INDEX "custom_auth_role_last_modified_by_id_idx" ON "custom_auth_role"("last_modified_by_id");

-- CreateIndex
CREATE INDEX "custom_auth_role_deleted_idx" ON "custom_auth_role"("deleted");

-- CreateIndex
CREATE INDEX "custom_auth_role_name_idx" ON "custom_auth_role"("name");

-- CreateIndex
CREATE INDEX "custom_auth_role_name_4ba7d950_like" ON "custom_auth_role"("name");

-- CreateIndex
CREATE INDEX "custom_auth_rolepermission_created_by_id_idx" ON "custom_auth_rolepermission"("created_by_id");

-- CreateIndex
CREATE INDEX "custom_auth_rolepermission_deleted_idx" ON "custom_auth_rolepermission"("deleted");

-- CreateIndex
CREATE INDEX "custom_auth_rolepermission_last_modified_by_id_idx" ON "custom_auth_rolepermission"("last_modified_by_id");

-- CreateIndex
CREATE INDEX "custom_auth_rolepermission_role_id_idx" ON "custom_auth_rolepermission"("role_id");

-- CreateIndex
CREATE INDEX "custom_auth_rolepermission_slug_idx" ON "custom_auth_rolepermission"("slug");

-- CreateIndex
CREATE INDEX "custom_auth_rolepermission_slug_858572f8_like" ON "custom_auth_rolepermission"("slug");

-- CreateIndex
CREATE INDEX "custom_auth_userrolerelationship_created_by_id_idx" ON "custom_auth_userrolerelationship"("created_by_id");

-- CreateIndex
CREATE INDEX "custom_auth_userrolerelationship_deleted_idx" ON "custom_auth_userrolerelationship"("deleted");

-- CreateIndex
CREATE INDEX "custom_auth_userrolerelationship_last_modified_by_id_idx" ON "custom_auth_userrolerelationship"("last_modified_by_id");

-- CreateIndex
CREATE INDEX "custom_auth_userrolerelationship_role_id_idx" ON "custom_auth_userrolerelationship"("role_id");

-- CreateIndex
CREATE INDEX "custom_auth_userrolerelationship_user_id_idx" ON "custom_auth_userrolerelationship"("user_id");

-- AddForeignKey
ALTER TABLE "custom_auth_role" ADD CONSTRAINT "custom_auth_role_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_auth_role" ADD CONSTRAINT "custom_auth_role_last_modified_by_id_fkey" FOREIGN KEY ("last_modified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_auth_rolepermission" ADD CONSTRAINT "custom_auth_rolepermission_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_auth_rolepermission" ADD CONSTRAINT "custom_auth_rolepermission_last_modified_by_id_fkey" FOREIGN KEY ("last_modified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_auth_rolepermission" ADD CONSTRAINT "custom_auth_rolepermission_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "custom_auth_role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_auth_userrolerelationship" ADD CONSTRAINT "custom_auth_userrolerelationship_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_auth_userrolerelationship" ADD CONSTRAINT "custom_auth_userrolerelationship_last_modified_by_id_fkey" FOREIGN KEY ("last_modified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_auth_userrolerelationship" ADD CONSTRAINT "custom_auth_userrolerelationship_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "custom_auth_role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_auth_userrolerelationship" ADD CONSTRAINT "custom_auth_userrolerelationship_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


INSERT INTO public.custom_auth_role 
( deleted, last_modified_at, created, name, description, category, created_by_id, last_modified_by_id)
VALUES
  ( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Admin', 'Admin Role with all permissions', 'system', NULL, NULL),
  ( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Read Only', 'Read Only Role with GET/LIST permissions', 'system', NULL, NULL);


-- Insert all permission records with the same current datetime
INSERT INTO public.custom_auth_rolepermission
( deleted, last_modified_at, created, slug, created_by_id, last_modified_by_id, role_id)
VALUES
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_access_users_tab', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_view_user', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_add_user', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_update_user', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_delete_user', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_view_all_roles', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_update_user_role', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_create_role_configurations', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_update_role_configurations', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_delete_role_configurations', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_view_data_layer', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_add_data_layer', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_update_data_layer', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_publish_data_layer', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_preview_data_layer', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_view_column_configurations', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_view_advance_filter', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_add_advance_filter', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_update_advance_filter', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_publish_advance_filter', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_view_school_master_data', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_update_school_master_data', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_publish_school_master_data', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_delete_api_key', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_approve_reject_api_key', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_view_country', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_add_country', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_update_country', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_delete_country', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_view_school', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_add_school', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_update_school', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_delete_school', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_view_uploaded_csv', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_import_csv', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_delete_csv', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_view_background_task', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_add_background_task', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_update_background_task', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_delete_background_task', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_view_contact_message', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_update_contact_message', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_delete_contact_message', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_view_recent_actions', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_view_notification', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_create_notification', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_delete_notification', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_delete_api_key', NULL, NULL, 2),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_view_cms', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_add_cms', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_update_cms', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_delete_cms', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_view_media_lib', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_add_media_lib', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_update_media_lib', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_delete_media_lib', NULL, NULL, 1);