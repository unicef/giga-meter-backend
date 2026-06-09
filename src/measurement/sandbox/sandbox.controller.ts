import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthGuard } from '../../auth/auth.guard';
import { ValidateSize } from '../../common/validation.decorator';
import { getRateLimitConfig } from '../../config/rate-limit.config';
import { EntityType, MeasurementSandboxDto } from './sandbox.dto';
import { MeasurementSandboxService } from './sandbox.service';

const ALLOWED_ENTITY_TYPES: ReadonlyArray<EntityType> = ['school', 'health'];
const ALLOWED_FILTER_BY = ['timestamp', 'created_at'];
const ALLOWED_FILTER_CONDITIONS = ['lt', 'lte', 'gt', 'gte', 'eq'];

/**
 * Sandbox controller for vendor end-to-end integration testing against
 * the upcoming polymorphic measurements model (school + health).
 *
 * IMPORTANT: This endpoint returns DUMMY data only. It does not query the
 * database. It exists so external integrators (e.g. Giga Maps) can build
 * against the new response shape — including timestamp-based polling —
 * before the underlying schema migration lands.
 *
 * Query semantics mirror /api/v1/measurements/v2:
 *   - page, size (max 1000)
 *   - orderBy: -timestamp (default), timestamp, created_at, -created_at
 *   - filterBy + filterCondition + filterValue: same as v2
 *   - country_iso3_code: ISO3, mapped to the stored iso2 internally
 *   - giga_id_school / giga_id_health: exact-match filters
 *   - entity_type: "school" | "health" (sandbox-only addition)
 *
 * Country whitelist enforcement is intentionally skipped here so vendors
 * can test all countries without needing them on their API key.
 */
@ApiTags('Measurements')
@Controller('api/v1/measurements')
@UseGuards(ThrottlerGuard)
@Throttle(getRateLimitConfig('measurements'))
export class MeasurementSandboxController {
  constructor(
    private readonly sandboxService: MeasurementSandboxService,
  ) {}

  @Get('v2/sandbox')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Sandbox endpoint returning DUMMY measurements (school + health) for ' +
      'vendor end-to-end integration testing. Mirrors v2 query/response ' +
      'semantics; not backed by the database.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the list of dummy measurements.',
    type: MeasurementSandboxDto,
    isArray: true,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized; invalid api key provided.',
  })
  @ApiQuery({
    name: 'entity_type',
    description:
      'Filter by entity type: "school" or "health". Omit to return both.',
    required: false,
    enum: ['school', 'health'],
  })
  @ApiQuery({
    name: 'giga_id_school',
    description: 'Exact-match filter on giga_id_school (school rows only).',
    required: false,
    type: 'string',
  })
  @ApiQuery({
    name: 'giga_id_health',
    description: 'Exact-match filter on giga_id_health (health rows only).',
    required: false,
    type: 'string',
  })
  @ApiQuery({
    name: 'country_iso3_code',
    description: 'ISO3 country code, eg: KEN, BRA, IND.',
    required: false,
    type: 'string',
  })
  @ApiQuery({
    name: 'filterValue',
    description:
      'Filter value compared against filterBy column, eg: 2026-04-01 or ' +
      '2026-04-01T12:00:00.000Z',
    required: false,
    type: 'string',
  })
  @ApiQuery({
    name: 'filterCondition',
    description: 'Accepted values: lt, lte, gt, gte, eq.',
    required: false,
    type: 'string',
  })
  @ApiQuery({
    name: 'filterBy',
    description: 'Column to filter on. Accepted: timestamp, created_at.',
    required: false,
    type: 'string',
  })
  @ApiQuery({
    name: 'orderBy',
    description:
      'Column to order by. Prefix with "-" for DESC. Accepted: timestamp, ' +
      '-timestamp, created_at, -created_at. Default: -timestamp.',
    required: false,
    type: 'string',
  })
  @ApiQuery({
    name: 'size',
    description: 'Page size (min: 1, max: 1000). Default: 10.',
    required: false,
    type: 'number',
  })
  @ApiQuery({
    name: 'page',
    description:
      'Number of pages to skip (zero-indexed). eg: page=2 size=10 skips 20 rows. Default: 0.',
    required: false,
    type: 'number',
  })
  async getSandboxMeasurementsV2(
    @Query('page') page?: number,
    @ValidateSize({ min: 1, max: 1000 })
    @Query('size')
    size?: number,
    @Query('orderBy') orderBy?: string,
    @Query('entity_type') entity_type?: string,
    @Query('giga_id_school') giga_id_school?: string,
    @Query('giga_id_health') giga_id_health?: string,
    @Query('country_iso3_code') country_iso3_code?: string,
    @Query('filterBy') filterBy?: string,
    @Query('filterCondition') filterCondition?: string,
    @Query('filterValue') filterValue?: Date,
  ): Promise<MeasurementSandboxDto[]> {
    validateSandboxParams(
      orderBy,
      filterBy,
      filterCondition,
      filterValue,
      entity_type,
    );

    return this.sandboxService.measurementsV2Sandbox({
      skip: (page ?? 0) * (size ?? 10),
      take: (size ?? 10) * 1,
      orderBy: orderBy ?? '-timestamp',
      entity_type: entity_type as EntityType | undefined,
      giga_id_school,
      giga_id_health,
      country_iso3_code,
      filter_by: filterBy ?? '',
      filter_condition: filterCondition ?? '',
      filter_value: filterValue ?? null,
    });
  }
}

function validateSandboxParams(
  orderBy?: string,
  filterBy?: string,
  filterCondition?: string,
  filterValue?: Date,
  entity_type?: string,
): void {
  if (
    orderBy &&
    !(orderBy.includes('timestamp') || orderBy.includes('created_at'))
  ) {
    throw new HttpException(
      'Invalid orderBy value provided, accepted values are: timestamp, -timestamp, created_at, -created_at',
      HttpStatus.BAD_REQUEST,
    );
  }
  if (filterBy && !ALLOWED_FILTER_BY.includes(filterBy)) {
    throw new HttpException(
      `Invalid filterBy value provided. Accepted: ${ALLOWED_FILTER_BY.join(', ')}`,
      HttpStatus.BAD_REQUEST,
    );
  }
  if (filterBy && !filterCondition) {
    throw new HttpException(
      `Please provide a valid filterCondition with filterBy column ${filterBy}`,
      HttpStatus.BAD_REQUEST,
    );
  }
  if (
    filterCondition &&
    !ALLOWED_FILTER_CONDITIONS.includes(filterCondition)
  ) {
    throw new HttpException(
      `Invalid filterCondition. Accepted: ${ALLOWED_FILTER_CONDITIONS.join(', ')}`,
      HttpStatus.BAD_REQUEST,
    );
  }
  if (filterBy && filterCondition && filterValue == null) {
    throw new HttpException(
      'No filterValue provided with filterBy and filterCondition values',
      HttpStatus.BAD_REQUEST,
    );
  }
  if (
    entity_type &&
    !ALLOWED_ENTITY_TYPES.includes(entity_type as EntityType)
  ) {
    throw new HttpException(
      `Invalid entity_type. Accepted: ${ALLOWED_ENTITY_TYPES.join(', ')}`,
      HttpStatus.BAD_REQUEST,
    );
  }
}
