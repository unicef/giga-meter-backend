import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { ApiSuccessResponseDto } from '../common/common.dto';
import { Countries, WriteAccess } from '../common/common.decorator';
import { ValidateSize } from '../common/validation.decorator';
import { CacheInterCeptorOptional } from '../config/cache.config';
import { HealthDetailDto, HealthListItemDto } from './health.dto';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('api/v1/health')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  // ---------------------------------------------------------------------------
  // GET /api/v1/health — paginated list
  // ---------------------------------------------------------------------------

  @Get()
  @UseInterceptors(CacheInterCeptorOptional)
  @ApiOperation({ summary: 'Returns a paginated list of health facility master records' })
  @ApiResponse({ status: 200, description: 'List of health facilities', type: HealthListItemDto, isArray: true })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({ name: 'country_code', required: false, description: 'Filter by country code, e.g. KE', type: 'string' })
  @ApiQuery({ name: 'govt_id', required: false, description: 'Government-assigned facility ID (matches dhis2_id, hims_id or hfml_id)', type: 'string' })
  @ApiQuery({ name: 'page', required: false, description: 'Zero-based page offset (default: 0)', type: 'number' })
  @ApiQuery({ name: 'size', required: false, description: 'Results per page (max 100, default: 10)', type: 'number' })
  @ApiQuery({
    name: 'orderBy',
    required: false,
    description: 'Column to sort by; prefix "-" for DESC, e.g. "-facility_name"',
    type: 'string',
  })
  async getHealth(
    @Query('country_code') country_code?: string,
    @Query('govt_id') govt_id?: string,
    @Query('page') page?: number,
    @ValidateSize({ min: 1, max: 100 }) @Query('size') size?: number,
    @Query('orderBy') orderBy?: string,
    @WriteAccess() write_access?: boolean,
    @Countries() countries?: string[],
  ): Promise<ApiSuccessResponseDto<HealthListItemDto[]>> {
    const data = await this.healthService.findAll(
      (page ?? 0) * (size ?? 10),
      size ?? 10,
      orderBy ?? 'facility_name',
      country_code,
      write_access,
      countries,
      govt_id,
    );

    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
      message: 'success',
    };
  }

  // ---------------------------------------------------------------------------
  // GET /api/v1/health/giga-id/:giga_id — single record by Giga ID
  // ---------------------------------------------------------------------------

  @Get('giga-id/:giga_id')
  @ApiOperation({ summary: 'Return health entity based on giga id' })
  @ApiResponse({ status: 200, description: 'Health facility detail', type: HealthDetailDto })
  @ApiResponse({ status: 401, description: 'Unauthorized — invalid or missing Bearer token' })
  @ApiResponse({ status: 404, description: 'No active health facility found for the given giga_id' })
  @ApiParam({ name: 'giga_id', description: 'Giga-assigned health facility UUID (health_id_giga)', type: 'string' })
  async getHealthByGigaId(
    @Param('giga_id') giga_id: string,
    @WriteAccess() write_access?: boolean,
    @Countries() countries?: string[],
  ): Promise<ApiSuccessResponseDto<HealthDetailDto>> {
    const data = await this.healthService.findByGigaId(
      giga_id,
      write_access,
      countries,
    );

    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
      message: 'success',
    };
  }
}
