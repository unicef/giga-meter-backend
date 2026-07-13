import { Module } from '@nestjs/common';
import { FeatureFlagService } from './feature-flag.service';
import { FeatureFlagController } from './feature-flag.controller';
import { FeatureFlagPublicController } from './feature-flag-public.controller';

@Module({
    controllers: [FeatureFlagController, FeatureFlagPublicController],
    providers: [FeatureFlagService],
    exports: [FeatureFlagService],
})
export class FeatureFlagModule { }
