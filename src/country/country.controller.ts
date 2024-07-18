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
import { AuthGuard } from 'src/auth/auth.guard';
import { ApiSuccessResponseDto } from 'src/common/common.dto';
import { CountryDto } from './country.dto';
import {
  Countries,
  CountriesIso3,
  WriteAccess,
} from 'src/common/common.decorator';

@ApiTags('Country')
@Controller('api/v1/dailycheckapp_countries')
export class CountryController {
  constructor(private readonly countryService: CountryService) {}

  @Get('')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Returns the list of registered countries on the Daily Check App database',
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
    @Query('size') size?: number,
    @WriteAccess() write_access?: boolean,
    @Countries() countries?: string[],
  ): Promise<ApiSuccessResponseDto<CountryDto[]>> {
    try {
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
    } catch (error) {
      throw new HttpException(
        'Failed to get countries with ' + error,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get(':code')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Returns the list of countries on the Daily Check App database by country code',
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
    try {
      if (!code || code.trim().length === 0)
        throw new HttpException('code is null/empty', HttpStatus.BAD_REQUEST);

      if (!write_access && !countries.includes(code.trim().toUpperCase())) {
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
    } catch (error) {
      throw new HttpException(
        'Failed to get countries with ' + error,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('code_iso3/:code_iso3')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Returns the list of countries on the Daily Check App database by country iso3 code',
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
    try {
      if (!code_iso3 || code_iso3.trim().length === 0)
        throw new HttpException(
          'code_iso3 is null/empty',
          HttpStatus.BAD_REQUEST,
        );
      if (
        !write_access &&
        !countries.includes(code_iso3.trim().toUpperCase())
      ) {
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
    } catch (error) {
      throw new HttpException(
        'Failed to get countries with ' + error,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Register a country in to the Daily Check App database',
  })
  @ApiResponse({
    status: 200,
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
    try {
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
    } catch (error) {
      throw new HttpException(
        'Failed to create country with ' + error,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(':code')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Remove a country from the Daily Check App database',
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
    try {
      if (!code || code.trim().length === 0)
        throw new HttpException('code is null/empty', HttpStatus.BAD_REQUEST);

      await this.countryService.deleteCountry(code.trim().toUpperCase());

      return {
        success: true,
        data: `country with code: ${code} deleted`,
        timestamp: new Date().toISOString(),
        message: 'success',
      };
    } catch (error) {
      throw new HttpException(
        'Failed to delete country with ' + error,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
