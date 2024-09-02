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
import { AuthGuard } from '../auth/auth.guard';
import {
  AddRecordResponseDto,
  ApiSuccessResponseDto,
} from '../common/common.dto';
import {
  MeasurementDto,
  MeasurementFailedDto,
  MeasurementV2Dto,
} from './measurement.dto';
import {
  Countries,
  CountriesIso3,
  WriteAccess,
} from '../common/common.decorator';
import { v4 as uuidv4 } from 'uuid';

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
    name: 'filterValue',
    description:
      'The filter value which needs to be compared with filterBy column, eg: 2024-01-14 or 2024-01-14T15:13:30.824Z',
    required: false,
    type: 'string',
  })
  @ApiQuery({
    name: 'filterCondition',
    description:
      'The filter condition for the filterBy, accepted values are: lt, lte, gt, gte, eq',
    required: false,
    type: 'string',
  })
  @ApiQuery({
    name: 'filterBy',
    description:
      'The column to which filter needs to be applied, eg: timestamp, created_at',
    required: false,
    type: 'string',
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
    name: 'orderBy',
    description:
      'The column by which the list needs to be ordered, eg: pass "created_at" to order by ASC and "-created_at" to order by DESC, default: -timestamp',
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
    @Query('orderBy') orderBy?: string,
    @Query('giga_id_school') giga_id_school?: string,
    @Query('country_iso3_code') country_iso3_code?: string,
    @Query('filterBy') filterBy?: string,
    @Query('filterCondition') filterCondition?: string,
    @Query('filterValue') filterValue?: Date,
    @WriteAccess() write_access?: boolean,
    @Countries() countries?: string[],
    @CountriesIso3() countries_iso3?: string[],
  ): Promise<ApiSuccessResponseDto<MeasurementDto[]>> {
    try {
      validateGetMeasurementsParams(
        orderBy,
        country_iso3_code,
        filterBy,
        filterCondition,
        filterValue,
        write_access,
        countries_iso3,
      );

      const measurements = await this.measurementService.measurements(
        (page ?? 0) * (size ?? 10),
        (size ?? 10) * 1,
        orderBy ?? '-timestamp',
        giga_id_school,
        country_iso3_code,
        filterBy ?? '',
        filterCondition ?? '',
        filterValue ?? null,
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

  @Get('v2')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Returns the list of registered measurements on the Daily Check App database in a brief structure',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the list of measurements',
    type: MeasurementV2Dto,
    isArray: true,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized; Invalid api key provided',
  })
  @ApiQuery({
    name: 'filterValue',
    description:
      'The filter value which needs to be compared with filterBy column, eg: 2024-01-14 or 2024-01-14T15:13:30.824Z',
    required: false,
    type: 'string',
  })
  @ApiQuery({
    name: 'filterCondition',
    description:
      'The filter condition for the filterBy, accepted values are: lt, lte, gt, gte, eq',
    required: false,
    type: 'string',
  })
  @ApiQuery({
    name: 'filterBy',
    description:
      'The column to which filter needs to be applied, eg: timestamp, created_at',
    required: false,
    type: 'string',
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
    name: 'orderBy',
    description:
      'The column by which the list needs to be ordered, eg: pass "created_at" to order by ASC and "-created_at" to order by DESC, default: -timestamp',
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
  async getMeasurementsV2(
    @Query('page') page?: number,
    @Query('size') size?: number,
    @Query('orderBy') orderBy?: string,
    @Query('giga_id_school') giga_id_school?: string,
    @Query('country_iso3_code') country_iso3_code?: string,
    @Query('filterBy') filterBy?: string,
    @Query('filterCondition') filterCondition?: string,
    @Query('filterValue') filterValue?: Date,
    @WriteAccess() write_access?: boolean,
    @Countries() countries?: string[],
    @CountriesIso3() countries_iso3?: string[],
  ): Promise<MeasurementV2Dto[]> {
    try {
      validateGetMeasurementsParams(
        orderBy,
        country_iso3_code,
        filterBy,
        filterCondition,
        filterValue,
        write_access,
        countries_iso3,
      );

      return await this.measurementService.measurementsV2(
        (page ?? 0) * (size ?? 10),
        (size ?? 10) * 1,
        orderBy ?? '-timestamp',
        giga_id_school,
        country_iso3_code,
        filterBy ?? '',
        filterCondition ?? '',
        filterValue ?? null,
        write_access,
        countries,
      );
    } catch (error) {
      throw new HttpException(
        'Failed to get measurements with ' + error,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('failed')
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Returns the list of failed measurements on the Daily Check App database in a brief structure',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the list of failed measurements',
    type: MeasurementFailedDto,
    isArray: true,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized; Invalid api key provided',
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
  async getMeasurementsFailed(
    @Query('page') page?: number,
    @Query('size') size?: number,
    @WriteAccess() write_access?: boolean,
    @Countries() countries?: string[],
  ): Promise<ApiSuccessResponseDto<MeasurementFailedDto[]>> {
    try {
      const measurements = await this.measurementService.measurementsFailed(
        (page ?? 0) * (size ?? 10),
        (size ?? 10) * 1,
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
    type: 'number',
  })
  async getMeasurementsById(
    @Param('id') id: number,
    @WriteAccess() write_access?: boolean,
    @Countries() countries?: string[],
  ): Promise<ApiSuccessResponseDto<MeasurementDto[]>> {
    try {
      if (!id || id === 0)
        throw new HttpException('id is zero/empty', HttpStatus.BAD_REQUEST);

      const measurements = await this.measurementService.measurementsById(
        id,
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
  async getMeasurementsBySchoolId(
    @Param('school_id') school_id: string,
    @WriteAccess() write_access?: boolean,
    @Countries() countries?: string[],
  ): Promise<ApiSuccessResponseDto<MeasurementDto[]>> {
    try {
      if (!school_id || school_id.trim().length === 0)
        throw new HttpException(
          'school_id is null/empty',
          HttpStatus.BAD_REQUEST,
        );

      const measurements = await this.measurementService.measurementsBySchoolId(
        school_id,
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

  @Post()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Register a measurement in to the Daily Check App database',
  })
  @ApiResponse({
    status: 201,
    description: 'Returns Id of measurement created',
    type: ApiSuccessResponseDto<AddRecordResponseDto>,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized; Invalid api key provided',
  })
  async createMeasurement(
    @Body() measurementDto: MeasurementDto,
  ): Promise<ApiSuccessResponseDto<AddRecordResponseDto>> {
    try {
      const response =
        await this.measurementService.createMeasurement(measurementDto);

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
    } catch (error) {
      throw new HttpException(
        'Failed to create measurement with ' + error,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}

function validateGetMeasurementsParams(
  orderBy?: string,
  country_iso3_code?: string,
  filterBy?: string,
  filterCondition?: string,
  filterValue?: Date,
  write_access?: boolean,
  countries_iso3?: string[],
) {
  if (
    orderBy &&
    !(orderBy?.includes('timestamp') || orderBy?.includes('created_at'))
  ) {
    throw new HttpException(
      'Invalid orderBy value provided, accepted values are: timestamp, -timestamp, created_at, -created_at',
      HttpStatus.BAD_REQUEST,
    );
  }
  if (filterBy && filterBy != 'timestamp' && filterBy != 'created_at') {
    throw new HttpException(
      'Invalid filterBy value provided',
      HttpStatus.BAD_REQUEST,
    );
  }
  if (filterBy && !filterCondition) {
    throw new HttpException(
      'Please provide a valid filterCondition with filterBy column ${filterBy}',
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
    !write_access &&
    country_iso3_code &&
    !countries_iso3.includes(country_iso3_code)
  ) {
    throw new HttpException('not authorized to access', HttpStatus.BAD_REQUEST);
  }
}
