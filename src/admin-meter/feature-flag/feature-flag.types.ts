import { FeatureFlagType, FeatureFlagScope } from '@prisma/client';

export interface ResolveContext {
    countryCode?: string;
    gigaIdSchool?: string;
}

export { FeatureFlagType, FeatureFlagScope };
