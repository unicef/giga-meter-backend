import { SetMetadata } from '@nestjs/common';

// Define a custom decorator for requiring specific categories
export const CATEGORY_KEY = 'categories';
export const RequiredCategories = (...categories: string[]) => SetMetadata(CATEGORY_KEY, categories);
