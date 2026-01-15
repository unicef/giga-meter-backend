export const PERMISSION_SLUGS = {
  CAN_VIEW_OWN_PROFILE: 'can_view_own_profile',

  CAN_ACCESS_USERS_TAB: 'can_access_users_tab',
  CAN_VIEW_USER: 'can_view_user',
  CAN_ADD_USER: 'can_add_user',
  CAN_UPDATE_USER: 'can_update_user',
  CAN_DELETE_USER: 'can_delete_user',

  CAN_VIEW_ALL_ROLES: 'can_view_all_roles',
  CAN_UPDATE_USER_ROLE: 'can_update_user_role',
  CAN_CREATE_ROLE_CONFIGURATIONS: 'can_create_role_configurations',
  CAN_UPDATE_ROLE_CONFIGURATIONS: 'can_update_role_configurations',
  CAN_DELETE_ROLE_CONFIGURATIONS: 'can_delete_role_configurations',

  CAN_VIEW_COUNTRY: 'can_view_country',
  CAN_ADD_COUNTRY: 'can_add_country',
  CAN_UPDATE_COUNTRY: 'can_update_country',
  CAN_DELETE_COUNTRY: 'can_delete_country',

  CAN_VIEW_SCHOOL: 'can_view_school',
  CAN_ADD_SCHOOL: 'can_add_school',
  CAN_UPDATE_SCHOOL: 'can_update_school',
  CAN_DELETE_SCHOOL: 'can_delete_school',

  // CMS Permissions
  CAN_VIEW_CMS: 'can_view_cms',
  CAN_ADD_CMS: 'can_add_cms',
  CAN_UPDATE_CMS: 'can_update_cms',
  CAN_DELETE_CMS: 'can_delete_cms',

  // Media Library Permissions
  CAN_VIEW_MEDIA_LIB: 'can_view_media_lib',
  CAN_ADD_MEDIA_LIB: 'can_add_media_lib',
  CAN_UPDATE_MEDIA_LIB: 'can_update_media_lib',
  CAN_DELETE_MEDIA_LIB: 'can_delete_media_lib',

  // Feature Flag Permissions
  CAN_VIEW_FEATURE_FLAG: 'can_view_feature_flag',
  CAN_CREATE_FEATURE_FLAG: 'can_create_feature_flag',
  CAN_UPDATE_FEATURE_FLAG: 'can_update_feature_flag',
} as const;

export type PermissionSlug =
  (typeof PERMISSION_SLUGS)[keyof typeof PERMISSION_SLUGS];

export const ROLES = {
  ADMIN: 'Admin',
  READ_ONLY: 'Read Only',
} as const;
