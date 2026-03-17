-- Add Feature Flag permissions to Admin (role_id=1) and Read Only (role_id=2)
INSERT INTO public.custom_auth_rolepermission
( deleted, last_modified_at, created, slug, created_by_id, last_modified_by_id, role_id)
VALUES
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_view_feature_flag', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_create_feature_flag', NULL, NULL, 1),
( NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'can_update_feature_flag', NULL, NULL, 1);