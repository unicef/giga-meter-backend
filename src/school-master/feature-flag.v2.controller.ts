import { Controller, Get, Logger, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { SchoolMasterService } from './school-master.service';

/** Flags an install gets when no school sets its own. */
const DEFAULT_FLAGS: Record<string, boolean> = { pingService: true };

/**
 * GET /api/v2/feature-flags — the flags the multi-facility app reads, keyed on
 * installation_id instead of a school giga id. It answers before any
 * registration exists and never 4xxs for an unknown installation, so a fleet
 * that cannot be updated always gets an answer.
 *
 * A school install gets the same flags as GET /api/v1/schools/features_flags;
 * any other install gets the defaults. The response is the flat flag map.
 */
@Public()
@ApiTags('Feature Flags V2')
@Controller('api/v2/feature-flags')
export class FeatureFlagV2Controller {
  private readonly logger = new Logger(FeatureFlagV2Controller.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly schoolMasterService: SchoolMasterService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'Resolve the feature flags for an installation (works before registration)',
  })
  @ApiQuery({ name: 'installation_id', required: false, type: String })
  @ApiQuery({ name: 'giga_id_school', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Flat map of flag key → enabled',
    schema: { type: 'object', additionalProperties: { type: 'boolean' } },
  })
  async resolve(
    @Query('installation_id') installationId?: string,
    @Query('giga_id_school') gigaIdSchool?: string,
  ): Promise<Record<string, boolean>> {
    if (!gigaIdSchool && installationId) {
      const registration = await this.prisma.registration.findFirst({
        where: { installation_id: installationId },
        orderBy: { id: 'desc' },
        select: { giga_id_school: true },
      });
      gigaIdSchool = registration?.giga_id_school ?? undefined;
    }
    if (!gigaIdSchool) {
      return { ...DEFAULT_FLAGS };
    }

    try {
      const flags = await this.schoolMasterService.flagsByGigaId(
        gigaIdSchool.trim().toLowerCase(),
      );
      return { ...DEFAULT_FLAGS, ...this.onlyBooleans(flags) };
    } catch (error) {
      // Unknown school: same answer as an unknown installation.
      this.logger.debug(`No flags for school ${gigaIdSchool}: ${error}`);
      return { ...DEFAULT_FLAGS };
    }
  }

  private onlyBooleans(flags: object): Record<string, boolean> {
    return Object.fromEntries(
      Object.entries(flags ?? {}).filter(
        ([, value]) => typeof value === 'boolean',
      ),
    );
  }
}
