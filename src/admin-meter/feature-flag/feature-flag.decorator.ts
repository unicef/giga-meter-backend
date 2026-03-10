import { SetMetadata } from '@nestjs/common';

export const FEATURE_FLAG_KEY = 'feature_flag';
export const RequireFeatureFlag = (key: string) => SetMetadata(FEATURE_FLAG_KEY, key);
