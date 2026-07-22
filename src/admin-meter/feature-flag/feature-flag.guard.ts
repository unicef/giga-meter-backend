import { Injectable, CanActivate, ExecutionContext, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureFlagService } from './feature-flag.service';
import { FEATURE_FLAG_KEY } from './feature-flag.decorator';

@Injectable()
export class FeatureFlagGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private featureFlagService: FeatureFlagService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredFlag = this.reflector.getAllAndOverride<string>(FEATURE_FLAG_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredFlag) {
            return true; // No flag required
        }

        const request = context.switchToHttp().getRequest();

        // Extract context: query params, route params, or body (depending on where the app passes them)
        const countryCode = request.query?.country_code || request.params?.country_code || request.body?.country_code;
        const gigaIdSchool = request.query?.giga_id_school || request.params?.giga_id_school || request.body?.giga_id_school;

        const isEnabled = await this.featureFlagService.isEnabled(requiredFlag, {
            countryCode,
            gigaIdSchool,
        });

        if (!isEnabled) {
            throw new NotFoundException(`Endpoint not found (feature flag ${requiredFlag} disabled)`);
        }

        return true;
    }
}
