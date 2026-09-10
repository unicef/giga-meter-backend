import { Controller, Get, Query, Param } from '@nestjs/common';
import { FeatureFlagService } from './feature-flag.service';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { ResolvedFlagsDto } from './dto/resolved-flags.dto';
import { Public } from 'src/common/public.decorator';

@Public()
@ApiTags('Feature Flags')
@Controller('api/v1/feature-flags')
export class FeatureFlagPublicController {
    constructor(private readonly featureFlagService: FeatureFlagService) { }

    @Get('resolve')
    @ApiOperation({ summary: 'Resolve all feature flags for a context' })
    @ApiQuery({ name: 'country_code', required: false, type: String })
    @ApiQuery({ name: 'giga_id_school', required: false, type: String })
    @ApiResponse({ type: ResolvedFlagsDto })
    async resolveAll(
        @Query('country_code') countryCode?: string,
        @Query('giga_id_school') gigaIdSchool?: string,
    ): Promise<ResolvedFlagsDto> {
        const flags = await this.featureFlagService.resolveAll({ countryCode, gigaIdSchool });
        return { flags };
    }

    @Get('resolve/:key')
    @ApiOperation({ summary: 'Resolve a single feature flag by key' })
    @ApiQuery({ name: 'country_code', required: false, type: String })
    @ApiQuery({ name: 'giga_id_school', required: false, type: String })
    async resolveOne(
        @Param('key') key: string,
        @Query('country_code') countryCode?: string,
        @Query('giga_id_school') gigaIdSchool?: string,
    ): Promise<{ enabled: boolean }> {
        const enabled = await this.featureFlagService.isEnabled(key, { countryCode, gigaIdSchool });
        return { enabled };
    }
}
