import {
  Controller,
  Get,
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
import { Countries, WriteAccess } from '../common/common.decorator';
import { ValidateSize } from '../common/validation.decorator';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { getRateLimitConfig } from 'src/config/rate-limit.config';
import { CacheInterCeptorOptional } from 'src/config/cache.config';
import { SchoolService } from 'src/school/school.service';
import { SchoolDto } from 'src/school/school.dto';
import { PublicService } from './public.service';

@ApiTags('Public')
@Controller('api/v1/public')
@UseGuards(ThrottlerGuard)
export class PublicController {
  constructor(
    private readonly schoolService: SchoolService,
    private readonly publicService: PublicService,
  ) {}

  @Get('get-registered-schools')
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

  @Get('get-countries')
  @UseInterceptors(CacheInterCeptorOptional)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Returns the list of registered countries on the Giga Meter database',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the list of countries',
    type: CountryDto,
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
  ): Promise<ApiSuccessResponseDto<CountryDto[]>> {
    const records = await this.countryService.countries({
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
}
