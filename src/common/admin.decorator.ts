import { SetMetadata } from '@nestjs/common';

export const IS_ADMIN_KEY = 'isAdmin';
export const AdminAccess = () => SetMetadata(IS_ADMIN_KEY, true);
