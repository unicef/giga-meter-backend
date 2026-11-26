import { Module } from '@nestjs/common';
import { FeatureFlagService } from './feature-flag.service';
import { FeatureFlagController } from './feature-flag.controller';
import { FeatureFlagPublicController } from './feature-flag-public.controller';
import { FeatureFlagPublicV2Controller } from './feature-flag-public.v2.controller';

@Module({
    controllers: [FeatureFlagController, FeatureFlagPublicController, FeatureFlagPublicV2Controller],
    providers: [FeatureFlagService],
    exports: [FeatureFlagService],
})
export class FeatureFlagModule { }
