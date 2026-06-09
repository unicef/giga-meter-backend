import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { v4 as uuidv4 } from 'uuid';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

import { MeasurementServiceV2 } from './measurement.service.v2';
import { CloudflareMeasurementDto } from './measurement.dto';
import {
  AddRecordResponseDto,
  ApiSuccessResponseDto,
} from '../common/common.dto';
import { Public } from '../common/public.decorator';
import { getRateLimitConfig } from '../config/rate-limit.config';

@ApiTags('Measurements')
@Controller('api/v2/measurements')
@UseGuards(ThrottlerGuard)
@Throttle(getRateLimitConfig('measurements'))
export class MeasurementV2Controller {
  constructor(private readonly measurementService: MeasurementServiceV2) {}

  @Post('cloudflare')
  @Public()
  @ApiOperation({
    summary: 'Register a Cloudflare measurement in the Giga Meter database',
  })
  @ApiResponse({
    status: 201,
    description: 'Measurement stored successfully',
    type: ApiSuccessResponseDto<AddRecordResponseDto>,
  })
  async createCloudflareMeasurement(
    @Body() measurementDto: CloudflareMeasurementDto,
  ): Promise<ApiSuccessResponseDto<AddRecordResponseDto>> {
    console.log('Received Cloudflare measurement:', measurementDto);
    await this.measurementService.createCloudflareMeasurement(measurementDto);

    return {
      success: true,
      data: { user_id: uuidv4() },
      timestamp: new Date().toISOString(),
      message: 'success',
    };
  }
}
