import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
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
import { CountryService } from './country.service';
import { AuthGuard } from '../auth/auth.guard';
import { ApiSuccessResponseDto } from '../common/common.dto';
import { CountryDto } from './country.dto';
import {
  Countries,
  CountriesIso3,
  WriteAccess,
} from '../common/common.decorator';
import { ValidateSize } from '../common/validation.decorator';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { getRateLimitConfig } from '../config/rate-limit.config';
import { CacheInterCeptorOptional } from 'src/config/cache.config';
import { Public } from 'src/common/public.decorator';

@ApiTags('Country')
@Controller('api/v1/dailycheckapp_countries')
@UseGuards(ThrottlerGuard)
@Throttle(getRateLimitConfig('countries'))
export class CountryController {
  constructor(private readonly countryService: CountryService) {}

  @Get('')
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
    @Query('size') size?: number,
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

  @Get(':code')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Returns the list of countries on the Giga Meter database by country code',
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
  @ApiParam({
    name: 'code',
    description: 'The country code',
    required: true,
    type: 'string',
  })
  async getCountriesByCode(
    @Param('code') code: string,
    @WriteAccess() write_access?: boolean,
    @Countries() countries?: string[],
  ): Promise<ApiSuccessResponseDto<CountryDto[]>> {
    if (!code || code.trim().length === 0)
      throw new HttpException('code is null/empty', HttpStatus.BAD_REQUEST);

    // TODO:// remove this logic after adding countries to non expired api keys 
    if (!write_access && !countries?.includes(code.trim().toUpperCase())) {
      throw new HttpException(
        'not authorized to access',
        HttpStatus.BAD_REQUEST,
      );
    }

    const records = await this.countryService.countriesByCode(
      code.trim().toUpperCase(),
    );

    return {
      success: true,
      data: records,
      timestamp: new Date().toISOString(),
      message: 'success',
    };
  }

  @Get('code_iso3/:code_iso3')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Returns the list of countries on the Giga Meter database by country iso3 code',
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
  @ApiParam({
    name: 'code_iso3',
    description: 'The country iso3 code',
    required: true,
    type: 'string',
  })
  async getCountriesByCodeIso3(
    @Param('code_iso3') code_iso3: string,
    @WriteAccess() write_access?: boolean,
    @CountriesIso3() countries?: string[],
  ): Promise<ApiSuccessResponseDto<CountryDto[]>> {
    if (!code_iso3 || code_iso3.trim().length === 0)
      throw new HttpException(
        'code_iso3 is null/empty',
        HttpStatus.BAD_REQUEST,
      );
    // TODO:// remove this logic after adding countries to non expired api keys 
    if (!write_access && !countries?.includes(code_iso3.trim().toUpperCase())) {
      throw new HttpException(
        'not authorized to access',
        HttpStatus.BAD_REQUEST,
      );
    }

    const records = await this.countryService.countriesByCodeIso3(
      code_iso3.trim().toUpperCase(),
    );

    return {
      success: true,
      data: records,
      timestamp: new Date().toISOString(),
      message: 'success',
    };
  }

  @Post()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Register a country in to the Giga Meter database',
  })
  @ApiResponse({
    status: 201,
    description: 'Returns Id of country created',
    type: String,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized; Invalid api key provided',
  })
  async createCountry(
    @Body() countryDto: CountryDto,
  ): Promise<ApiSuccessResponseDto<string>> {
    if (countryDto == null)
      throw new HttpException('countryDto is null', HttpStatus.BAD_REQUEST);
    if (!countryDto.code || countryDto.code.trim().length == 0)
      throw new HttpException(
        'countryDto.code is null/empty',
        HttpStatus.BAD_REQUEST,
      );
    if (!countryDto.code_iso3 || countryDto.code_iso3.trim().length == 0)
      throw new HttpException(
        'countryDto.code_iso3 is null/empty',
        HttpStatus.BAD_REQUEST,
      );

    const countryId = await this.countryService.createCountry(countryDto);

    if (countryId == null) {
      throw new HttpException(
        `country with code: ${countryDto.code} already exists`,
        HttpStatus.BAD_REQUEST,
      );
    }

    return {
      success: true,
      data: countryId,
      timestamp: new Date().toISOString(),
      message: 'success',
    };
  }

  @Delete(':code')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Remove a country from the Giga Meter database',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns Id of country deleted',
    type: String,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized; Invalid api key provided',
  })
  @ApiParam({
    name: 'code',
    description: 'The country code',
    required: true,
    type: 'string',
  })
  async deleteCountry(
    @Param('code') code: string,
  ): Promise<ApiSuccessResponseDto<string>> {
    if (!code || code.trim().length === 0)
      throw new HttpException('code is null/empty', HttpStatus.BAD_REQUEST);

    await this.countryService.deleteCountry(code.trim().toUpperCase());

    return {
      success: true,
      data: `country with code: ${code} deleted`,
      timestamp: new Date().toISOString(),
      message: 'success',
    };
  }

  @Public()
  @Get('all')
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
  async getAllCountries(
    @Query('page') page?: number,
    @ValidateSize({ min: 1, max: 100 }) 
    @Query('size') size?: number,
  ): Promise<ApiSuccessResponseDto<CountryDto[]>> {
    const records = await this.countryService.getAllCountries({
      skip: (page ?? 0) * (size ?? 10),
      take: (size ?? 10) * 1,
    });

    return {
      success: true,
      data: records,
      timestamp: new Date().toISOString(),
      message: 'success',
    };
  }
}
