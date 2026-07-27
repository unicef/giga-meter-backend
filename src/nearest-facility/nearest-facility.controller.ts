import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../common/public.decorator';
import { toEntityTypeFieldName } from '../common/facility-type-compat';
import { ApiSuccessResponseDto } from '../common/common.dto';
import {
  FindNearestFacilityDto,
  NearestFacilityResponseDto,
} from './nearest-facility.dto';
import { NearestFacilityService } from './nearest-facility.service';

@ApiTags('nearest-facility')
@Controller('api/v1/nearest-facility')
export class NearestFacilityController {
  constructor(private readonly nearestFacilityService: NearestFacilityService) {}

  /**
   * POST /api/v1/nearest-facility
   *
   * Finds the nearest facility (school OR health) within a configurable radius.
   * Auth: Public.
   */
  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  @ApiOperation({ summary: 'Find the nearest school or health facility within the configured radius' })
  @ApiBody({ type: FindNearestFacilityDto })
  @ApiResponse({
    status: 200,
    description: 'Nearest facility details with distance',
    type: NearestFacilityResponseDto,
  })
  @ApiResponse({ status: 400, description: 'entity_type missing or invalid' })
  @ApiResponse({ status: 404, description: 'No facility within configured max distance' })
  async findNearestFacility(
    @Body() dto: FindNearestFacilityDto,
  ): Promise<ApiSuccessResponseDto<NearestFacilityResponseDto>> {
    if (!dto.entity_type) {
      throw new BadRequestException(
        'entity_type is required and must be "school" or "health"',
      );
    }

    const data = await this.nearestFacilityService.findNearest(
      dto.latitude,
      dto.longitude,
      dto.entity_type,
    );

    return {
      success: true,
      data: toEntityTypeFieldName(data),
      timestamp: new Date().toISOString(),
      message: 'success',
    };
  }
}
