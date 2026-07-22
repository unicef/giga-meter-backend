import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FeatureFlagService } from './feature-flag.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Public } from 'src/common/public.decorator';

/**
 * GET /api/v2/feature-flags — facility-agnostic flags keyed on
 * installation_id. This is the remote kill-switch for the un-updatable
 * fleet, so it must stay liberal and always-available:
 *   - works BEFORE any registration exists (returns global defaults),
 *   - never 4xxs for an unknown installation_id,
 *   - returns the flags flat (no wrapper), per the v2 client contract.
 */
@Public()
@ApiTags('Feature Flags V2')
@Controller('api/v2/feature-flags')
export class FeatureFlagPublicV2Controller {
  constructor(
    private readonly featureFlagService: FeatureFlagService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'Resolve all feature flags for an installation (works pre-registration)',
  })
  @ApiQuery({ name: 'installation_id', required: false, type: String })
  @ApiQuery({ name: 'country_code', required: false, type: String })
  @ApiQuery({ name: 'giga_id_school', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Flat map of flag key → enabled',
    schema: { type: 'object', additionalProperties: { type: 'boolean' } },
  })
  async resolveForInstallation(
    @Query('installation_id') installationId?: string,
    @Query('country_code') countryCode?: string,
    @Query('giga_id_school') gigaIdSchool?: string,
  ): Promise<Record<string, boolean>> {
    // Enrich the context from the registration when we can; stay silent when
    // we can't — flags must resolve even for unknown installs.
    if (installationId && (!countryCode || !gigaIdSchool)) {
      const registration = await this.prisma.registration.findFirst({
        where: { installation_id: installationId },
        orderBy: { id: 'desc' },
        select: { country_code: true, giga_id_school: true },
      });
      if (registration) {
        countryCode = countryCode ?? registration.country_code ?? undefined;
        gigaIdSchool =
          gigaIdSchool ?? registration.giga_id_school ?? undefined;
      }
    }

    return this.featureFlagService.resolveAll({ countryCode, gigaIdSchool });
  }
}
