import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApiSuccessResponseDto } from '../common/common.dto';
import {
  Countries,
  CountriesIso3,
  IsSuperUser,
  WriteAccess,
} from '../common/common.decorator';
import { ValidateSize } from '../common/validation.decorator';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { getRateLimitConfig } from 'src/config/rate-limit.config';
import { CacheInterCeptorOptional } from 'src/config/cache.config';
import { SchoolService } from 'src/school/school.service';
import { SchoolDto } from 'src/school/school.dto';
import { PublicService } from './public.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { PublicCountryDto, PublicMeasurementDto } from './public.dto';

@ApiTags('Public')
@Controller('api/v1/public')
@UseGuards(ThrottlerGuard)
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class PublicController {
  constructor(
    private readonly schoolService: SchoolService,
    private readonly publicService: PublicService,
  ) {}

  @Get('schools')
  @Throttle(getRateLimitConfig('schools'))
  @UseInterceptors(CacheInterCeptorOptional)
  @ApiOperation({
    summary:
      'Returns the list of registered schools on the Giga Meter database',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the list of schools',
    type: SchoolDto,
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
      'The GIGA id of a school, eg: 2abb47dd-3fca-44b1-b6c8-0ec0c863c236',
    required: false,
    type: 'string',
  })
  @ApiQuery({
    name: 'size',
    description: 'The number of schools to return, default: 10',
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
  async getSchools(
    @Query('page') page?: number,
    @ValidateSize({ min: 1, max: 100 })
    @Query('size')
    size?: number,
    @Query('giga_id_school') giga_id_school?: string,
    @Query('country_iso3_code') country_iso3_code?: string,
    @WriteAccess() write_access?: boolean,
    @Countries() countries?: string[],
  ): Promise<ApiSuccessResponseDto<SchoolDto[]>> {
    const schools = await this.publicService.schools(
      (page ?? 0) * (size ?? 10),
      (size ?? 10) * 1,
      giga_id_school,
      country_iso3_code,
      write_access,
      countries,
    );

    return {
      success: true,
      data: schools,
      timestamp: new Date().toISOString(),
      message: 'success',
    };
  }

  @Get('countries')
  @UseInterceptors(CacheInterCeptorOptional)
  @Throttle(getRateLimitConfig('countries'))
  @ApiOperation({
    summary:
      'Returns the list of registered countries on the Giga Meter database',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the list of countries',
    type: PublicCountryDto,
    isArray: true,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized; Invalid api key provided',
  })
  @ApiQuery({
    name: 'size',
    description: 'The number of countries to return, default: 10',
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
  async getCountries(
    @Query('page') page?: number,
    @ValidateSize({ min: 1, max: 100 })
    @Query('size')
    size?: number,
    @WriteAccess() write_access?: boolean,
    @Countries() countries?: string[],
  ): Promise<ApiSuccessResponseDto<PublicCountryDto[]>> {
    const records = await this.publicService.countries({
      skip: (page ?? 0) * (size ?? 10),
      take: (size ?? 10) * 1,
      write_access,
      countries,
    });

    return {
      success: true,
      data: records,
      timestamp: new Date().toISOString(),
      message: 'success',
    };
  }

  @Get('measurements')
  @Throttle(getRateLimitConfig('measurements'))
  @UseInterceptors(CacheInterCeptorOptional)
  @ApiOperation({
    summary:
      'Returns the list of registered measurements on the Giga Meter database',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the list of measurements',
    type: PublicMeasurementDto,
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
    description:
      'The number of measurements to return (min: 1, max: 100), default: 10',
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
    @ValidateSize({ min: 1, max: 100 }) @Query('size') size?: number,
    @Query('orderBy') orderBy?: string,
    @Query('giga_id_school') giga_id_school?: string,
    @Query('country_iso3_code') country_iso3_code?: string,
    @Query('filterBy') filterBy?: string,
    @Query('filterCondition') filterCondition?: string,
    @Query('filterValue') filterValue?: Date,
    @WriteAccess() write_access?: boolean,
    @Countries() countries?: string[],
    @IsSuperUser() isSuperUser?: boolean,
    @CountriesIso3() countries_iso3?: string[],
  ): Promise<ApiSuccessResponseDto<PublicMeasurementDto[]>> {
    validatePublicGetMeasurementsParams(
      orderBy,
      country_iso3_code,
      filterBy,
      filterCondition,
      filterValue,
      write_access,
      countries_iso3,
    );

    const measurements = await this.publicService.measurements(
      (page ?? 0) * (size ?? 10),
      size ?? 10,
      orderBy ?? '-timestamp',
      giga_id_school,
      country_iso3_code,
      filterBy ?? '',
      filterCondition ?? '',
      filterValue ?? null,
      write_access,
      countries,
      isSuperUser,
    );

    return {
      success: true,
      data: measurements,
      timestamp: new Date().toISOString(),
      message: 'success',
    };
  }
}

function validatePublicGetMeasurementsParams(
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
  // TODO:// remove this logic after adding countries to non expired api keys
  if (
    !write_access &&
    country_iso3_code &&
    !countries_iso3.includes(country_iso3_code)
  ) {
    throw new HttpException('not authorized to access', HttpStatus.BAD_REQUEST);
  }
}
