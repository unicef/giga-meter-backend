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
  ( NULL, '2025-09-12T13:04:57.929Z', '2025-09-12T13:04:57.930Z', 'Admin', 'Admin Role with all permissions', 'system', NULL, NULL),
  ( NULL, '2025-09-12T13:04:57.935Z', '2025-09-12T13:04:57.935Z', 'Read Only', 'Read Only Role with GET/LIST permissions', 'system', NULL, NULL);


-- Insert seed records
INSERT INTO public.custom_auth_rolepermission
( deleted, last_modified_at, created, slug, created_by_id, last_modified_by_id, role_id)
VALUES
( NULL, '2025-09-12 13:04:57.949903+00', '2025-09-12 13:04:57.949961+00', 'can_access_users_tab', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:57.956697+00', '2025-09-12 13:04:57.956804+00', 'can_view_user', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:57.961978+00', '2025-09-12 13:04:57.962117+00', 'can_add_user', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:57.967471+00', '2025-09-12 13:04:57.967519+00', 'can_update_user', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:57.97431+00', '2025-09-12 13:04:57.974345+00', 'can_delete_user', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:57.979032+00', '2025-09-12 13:04:57.979088+00', 'can_view_all_roles', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:57.984857+00', '2025-09-12 13:04:57.984901+00', 'can_update_user_role', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:57.99322+00', '2025-09-12 13:04:57.99326+00', 'can_create_role_configurations', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:58.00049+00', '2025-09-12 13:04:58.000621+00', 'can_update_role_configurations', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:58.006895+00', '2025-09-12 13:04:58.006941+00', 'can_delete_role_configurations', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:58.013229+00', '2025-09-12 13:04:58.013291+00', 'can_view_data_layer', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:58.018342+00', '2025-09-12 13:04:58.018387+00', 'can_add_data_layer', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:58.024165+00', '2025-09-12 13:04:58.02435+00', 'can_update_data_layer', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:58.029148+00', '2025-09-12 13:04:58.02919+00', 'can_publish_data_layer', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:58.033698+00', '2025-09-12 13:04:58.033735+00', 'can_preview_data_layer', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:58.039312+00', '2025-09-12 13:04:58.039358+00', 'can_view_column_configurations', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:58.044475+00', '2025-09-12 13:04:58.044522+00', 'can_view_advance_filter', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:58.051967+00', '2025-09-12 13:04:58.052046+00', 'can_add_advance_filter', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:58.057708+00', '2025-09-12 13:04:58.057753+00', 'can_update_advance_filter', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:58.063867+00', '2025-09-12 13:04:58.063929+00', 'can_publish_advance_filter', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:58.071441+00', '2025-09-12 13:04:58.07151+00', 'can_view_school_master_data', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:58.076896+00', '2025-09-12 13:04:58.076935+00', 'can_update_school_master_data', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:58.084445+00', '2025-09-12 13:04:58.08451+00', 'can_publish_school_master_data', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:58.090752+00', '2025-09-12 13:04:58.090798+00', 'can_delete_api_key', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:58.095318+00', '2025-09-12 13:04:58.095356+00', 'can_approve_reject_api_key', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:58.100957+00', '2025-09-12 13:04:58.100991+00', 'can_view_country', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:58.106667+00', '2025-09-12 13:04:58.106717+00', 'can_add_country', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:58.11257+00', '2025-09-12 13:04:58.112603+00', 'can_update_country', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:58.117999+00', '2025-09-12 13:04:58.118044+00', 'can_delete_country', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:58.126001+00', '2025-09-12 13:04:58.126075+00', 'can_view_school', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:58.132702+00', '2025-09-12 13:04:58.13274+00', 'can_add_school', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:58.143203+00', '2025-09-12 13:04:58.143277+00', 'can_update_school', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:58.15028+00', '2025-09-12 13:04:58.150491+00', 'can_delete_school', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:58.156349+00', '2025-09-12 13:04:58.156399+00', 'can_view_uploaded_csv', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:58.162863+00', '2025-09-12 13:04:58.162922+00', 'can_import_csv', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:58.169297+00', '2025-09-12 13:04:58.169346+00', 'can_delete_csv', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:58.174532+00', '2025-09-12 13:04:58.17457+00', 'can_view_background_task', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:58.180804+00', '2025-09-12 13:04:58.180858+00', 'can_add_background_task', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:58.186817+00', '2025-09-12 13:04:58.186872+00', 'can_update_background_task', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:58.192951+00', '2025-09-12 13:04:58.192986+00', 'can_delete_background_task', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:58.198229+00', '2025-09-12 13:04:58.198298+00', 'can_view_contact_message', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:58.204972+00', '2025-09-12 13:04:58.205022+00', 'can_update_contact_message', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:58.210835+00', '2025-09-12 13:04:58.210878+00', 'can_delete_contact_message', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:58.216453+00', '2025-09-12 13:04:58.216494+00', 'can_view_recent_actions', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:58.222135+00', '2025-09-12 13:04:58.222216+00', 'can_view_notification', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:58.227395+00', '2025-09-12 13:04:58.227441+00', 'can_create_notification', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:58.231973+00', '2025-09-12 13:04:58.232007+00', 'can_delete_notification', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:58.245356+00', '2025-09-12 13:04:58.245429+00', 'can_delete_api_key', NULL, NULL, 2)
( NULL, '2025-09-12 13:04:57.956697+00', '2025-09-12 13:04:57.956804+00', 'can_view_cms', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:57.961978+00', '2025-09-12 13:04:57.962117+00', 'can_add_cms', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:57.967471+00', '2025-09-12 13:04:57.967519+00', 'can_update_cms', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:57.97431+00', '2025-09-12 13:04:57.974345+00', 'can_delete_cms', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:57.956697+00', '2025-09-12 13:04:57.956804+00', 'can_view_media_lib', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:57.961978+00', '2025-09-12 13:04:57.962117+00', 'can_add_media_lib', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:57.967471+00', '2025-09-12 13:04:57.967519+00', 'can_update_media_lib', NULL, NULL, 1),
( NULL, '2025-09-12 13:04:57.97431+00', '2025-09-12 13:04:57.974345+00', 'can_delete_media_lib', NULL, NULL, 1);