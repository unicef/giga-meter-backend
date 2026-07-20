import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  ParseArrayPipe,
  Post,
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
import { v4 as uuidv4 } from 'uuid';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

import { MeasurementServiceV2 } from './measurement.service.v2';
import { MeasurementService } from './measurement.service';
import {
  AddMeasurementFacilityV2Dto,
  CloudflareMeasurementDto,
  MeasurementFacilityV2Dto,
} from './measurement.dto';
import {
  AddRecordResponseDto,
  ApiSuccessResponseDto,
} from '../common/common.dto';
import { Public } from '../common/public.decorator';
import { getRateLimitConfig } from '../config/rate-limit.config';
import { AuthGuard } from '../auth/auth.guard';
import { Countries, CountriesIso3, WriteAccess } from '../common/common.decorator';
import { ValidateSize } from '../common/validation.decorator';
import { validateGetMeasurementsParams } from './measurement-query-validation';

@ApiTags('Measurements V2')
@Controller('api/v2/measurements')
@UseGuards(ThrottlerGuard)
@Throttle(getRateLimitConfig('measurements'))
export class MeasurementV2Controller {
  constructor(
    private readonly measurementServiceV2: MeasurementServiceV2,
    private readonly measurementService: MeasurementService,
  ) {}

  @Post()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Facility-aware measurement submission for health (and school) devices (V2)',
  })
  @ApiResponse({
    status: 201,
    description: 'Measurement created',
    type: ApiSuccessResponseDto<AddRecordResponseDto>,
  })
  async createMeasurementFacilityV2(
    @Body() dto: AddMeasurementFacilityV2Dto,
  ): Promise<ApiSuccessResponseDto<AddRecordResponseDto>> {
    const response =
      await this.measurementService.createMeasurementFacilityV2(dto);
    if (response.length) {
      throw new HttpException(
        'Failed to add measurement with error: ' + response,
        HttpStatus.BAD_REQUEST,
      );
    }
    return {
      success: true,
      data: { user_id: uuidv4() },
      timestamp: new Date().toISOString(),
      message: 'success',
    };
  }

  @Post('batch')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Batch measurement submission (V2) — offline queue flush. Array body, ' +
      'same record shape as POST /api/v2/measurements. Tolerant: one bad ' +
      'record does not reject the batch.',
  })
  @ApiResponse({
    status: 201,
    description:
      'Batch processed — returns accepted/rejected counts and per-record errors',
  })
  async createMeasurementBatchV2(
    @Body(new ParseArrayPipe({ items: AddMeasurementFacilityV2Dto }))
    records: AddMeasurementFacilityV2Dto[],
  ): Promise<
    ApiSuccessResponseDto<{
      accepted: number;
      rejected: number;
      errors: { index: number; error: string }[];
    }>
  > {
    const errors: { index: number; error: string }[] = [];
    let accepted = 0;
    for (let i = 0; i < records.length; i++) {
      try {
        const result =
          await this.measurementService.createMeasurementFacilityV2(records[i]);
        if (result.length) {
          errors.push({ index: i, error: result });
        } else {
          accepted++;
        }
      } catch (error) {
        errors.push({ index: i, error: error?.message ?? String(error) });
      }
    }
    return {
      success: errors.length < records.length || records.length === 0,
      data: { accepted, rejected: errors.length, errors },
      timestamp: new Date().toISOString(),
      message: errors.length ? 'partial' : 'success',
    };
  }

  @Get('facility')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Facility-aware measurement list (V2). Returns facility_type instead of entity_type.',
  })
  @ApiResponse({
    status: 200,
    type: MeasurementFacilityV2Dto,
    isArray: true,
  })
  @ApiQuery({ name: 'facility_type', required: false, type: 'string' })
  @ApiQuery({ name: 'giga_id_health', required: false, type: 'string' })
  @ApiQuery({ name: 'giga_id_school', required: false, type: 'string' })
  @ApiQuery({ name: 'filterValue', required: false, type: 'string' })
  @ApiQuery({ name: 'filterCondition', required: false, type: 'string' })
  @ApiQuery({ name: 'filterBy', required: false, type: 'string' })
  @ApiQuery({ name: 'country_iso3_code', required: false, type: 'string' })
  @ApiQuery({ name: 'orderBy', required: false, type: 'string' })
  @ApiQuery({ name: 'size', required: false, type: 'number' })
  @ApiQuery({ name: 'page', required: false, type: 'number' })
  async getMeasurementsV2Facility(
    @Query('page') page?: number,
    @ValidateSize({ min: 1, max: 1000 })
    @Query('size')
    size?: number,
    @Query('orderBy') orderBy?: string,
    @Query('facility_type') facility_type?: string,
    @Query('giga_id_health') giga_id_health?: string,
    @Query('giga_id_school') giga_id_school?: string,
    @Query('country_iso3_code') country_iso3_code?: string,
    @Query('filterBy') filterBy?: string,
    @Query('filterCondition') filterCondition?: string,
    @Query('filterValue') filterValue?: Date,
    @WriteAccess() write_access?: boolean,
    @Countries() countries?: string[],
    @CountriesIso3() countries_iso3?: string[],
  ): Promise<MeasurementFacilityV2Dto[]> {
    validateGetMeasurementsParams(
      orderBy,
      country_iso3_code,
      filterBy,
      filterCondition,
      filterValue,
      write_access,
      countries_iso3,
    );

    return this.measurementService.measurementsV2Facility(
      (page ?? 0) * (size ?? 10),
      size ?? 10,
      orderBy ?? '-timestamp',
      facility_type,
      giga_id_health,
      giga_id_school,
      country_iso3_code,
      filterBy ?? '',
      filterCondition ?? '',
      filterValue ?? null,
      write_access,
      countries,
    );
  }

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
    await this.measurementServiceV2.createCloudflareMeasurement(measurementDto);

    return {
      success: true,
      data: { user_id: uuidv4() },
      timestamp: new Date().toISOString(),
      message: 'success',
    };
  }
}
