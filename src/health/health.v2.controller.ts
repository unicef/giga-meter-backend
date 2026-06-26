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

@ApiTags('Health V2')
@Controller('api/v2/health')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class HealthV2Controller {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @UseInterceptors(CacheInterCeptorOptional)
  @ApiOperation({ summary: 'Returns a paginated list of health facility master records (V2)' })
  @ApiResponse({ status: 200, description: 'List of health facilities', type: HealthListItemDto, isArray: true })
  @ApiQuery({ name: 'country_code', required: false, type: 'string' })
  @ApiQuery({ name: 'page', required: false, type: 'number' })
  @ApiQuery({ name: 'size', required: false, type: 'number' })
  @ApiQuery({ name: 'orderBy', required: false, type: 'string' })
  async getHealth(
    @Query('country_code') country_code?: string,
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
    );

    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
      message: 'success',
    };
  }

  @Get('giga-id/:giga_id')
  @ApiOperation({ summary: 'Return health facility based on giga id (V2)' })
  @ApiResponse({ status: 200, description: 'Health facility detail', type: HealthDetailDto })
  @ApiParam({ name: 'giga_id', type: 'string' })
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
