import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { MeasurementService } from './measurement.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { ApiSuccessResponseDto } from 'src/common/common.dto';
import { MeasurementDto } from './measurement.dto';
import { Countries, WriteAccess } from 'src/common/common.decorator';

@ApiTags('Measurements')
@Controller('api/v1/measurements')
export class MeasurementController {
  constructor(private readonly measurementService: MeasurementService) {}

  @Get('')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Returns the list of registered measurements on the Daily Check App database',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the list of measurements',
    type: MeasurementDto,
    isArray: true,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized; Invalid api key provided',
  })
  @ApiQuery({
    name: 'country_iso3_code',
    description: 'The ISO3 code of a country, eg: IND',
    required: false,
    type: 'string',
  })
  @ApiQuery({
    name: 'giga_id_school',
    description:
      'The GIGA id of a measurement, eg: 2abb47dd-3fca-44b1-b6c8-0ec0c863c236',
    required: false,
    type: 'string',
  })
  @ApiQuery({
    name: 'size',
    description: 'The number of measurements to return, default: 10',
    required: false,
    type: 'number',
  })
  @ApiQuery({
    name: 'page',
    description:
      'The number of pages to skip before starting to collect the result, eg: if page=2 and size=10, it will skip 20 (2*10) records, default: 0',
    required: false,
    type: 'number',
  })
  async getMeasurements(
    @Query('page') page?: number,
    @Query('size') size?: number,
    @Query('giga_id_school') giga_id_school?: string,
    @Query('country_iso3_code') country_iso3_code?: string,
    @WriteAccess() write_access?: boolean,
    @Countries() countries?: string[],
  ): Promise<ApiSuccessResponseDto<MeasurementDto[]>> {
    try {
      const measurements = await this.measurementService.measurements(
        (page ?? 0) * (size ?? 10),
        (size ?? 10) * 1,
        '',
        giga_id_school,
        country_iso3_code,
        '',
        '',
        null,
        write_access,
        countries,
      );

      return {
        success: true,
        data: measurements,
        timestamp: new Date().toISOString(),
        message: 'success',
      };
    } catch (error) {
      throw new HttpException(
        'Failed to get measurements with ' + error,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Returns the list of measurements on the Daily Check App database by giga id measurement',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the list of measurements',
    type: MeasurementDto,
    isArray: true,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized; Invalid api key provided',
  })
  @ApiParam({
    name: 'id',
    description: 'The id of measurement',
    required: true,
    type: 'string',
  })
  async getMeasurementsByGigaId(
    @Param('id') id: string,
  ): Promise<ApiSuccessResponseDto<MeasurementDto[]>> {
    try {
      if (!id || id.trim().length === 0)
        throw new HttpException('id is null/empty', HttpStatus.BAD_REQUEST);

      const measurements = await this.measurementService.measurementsById(id);

      return {
        success: true,
        data: measurements,
        timestamp: new Date().toISOString(),
        message: 'success',
      };
    } catch (error) {
      throw new HttpException(
        'Failed to get measurements with ' + error,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('school_id/:school_id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Returns the list of measurements on the Daily Check App database by school id',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the list of measurements',
    type: MeasurementDto,
    isArray: true,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized; Invalid api key provided',
  })
  @ApiParam({
    name: 'school_id',
    description: 'The school id of measurement',
    required: true,
    type: 'string',
  })
  async getMeasurementsById(
    @Param('school_id') school_id: string,
  ): Promise<ApiSuccessResponseDto<MeasurementDto[]>> {
    try {
      if (!school_id || school_id.trim().length === 0)
        throw new HttpException(
          'school_id is null/empty',
          HttpStatus.BAD_REQUEST,
        );

      const measurements =
        await this.measurementService.measurementsBySchoolId(school_id);

      return {
        success: true,
        data: measurements,
        timestamp: new Date().toISOString(),
        message: 'success',
      };
    } catch (error) {
      throw new HttpException(
        'Failed to get measurements with ' + error,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Register a measurement in to the Daily Check App database',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns Id of measurement created',
    type: String,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized; Invalid api key provided',
  })
  async createMeasurements(
    @Body() measurementDto: MeasurementDto,
  ): Promise<ApiSuccessResponseDto<string>> {
    try {
      const measurementId =
        await this.measurementService.createMeasurement(measurementDto);

      return {
        success: true,
        data: measurementId,
        timestamp: new Date().toISOString(),
        message: 'success',
      };
    } catch (error) {
      throw new HttpException(
        'Failed to create measurement with ' + error,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
