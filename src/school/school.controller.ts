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
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SchoolService } from './school.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { ApiSuccessResponseDto } from 'src/common/common.dto';
import { SchoolDto } from './school.dto';
import { Countries, WriteAccess } from 'src/common/common.decorator';

@ApiTags('Schools')
@Controller('api/v1/dailycheckapp_schools')
export class SchoolController {
  constructor(private readonly schoolService: SchoolService) {}

  @Get('')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Returns the list of registered schools on the Daily Check App database',
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
    @Query('size') size?: number,
    @Query('giga_id_school') giga_id_school?: string,
    @Query('country_iso3_code') country_iso3_code?: string,
    @WriteAccess() write_access?: boolean,
    @Countries() countries?: string[],
  ): Promise<ApiSuccessResponseDto<SchoolDto[]>> {
    try {
      const schools = await this.schoolService.schools(
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
    } catch (error) {
      throw new HttpException('Failed to get schools', HttpStatus.BAD_REQUEST);
    }
  }

  @Get(':giga_id_school')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Returns the list of schools on the Daily Check App database by giga id school',
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
  @ApiParam({
    name: 'giga_id_school',
    description: 'The giga id school',
    required: true,
    type: 'string',
  })
  async getSchoolsByGigaId(
    @Param('giga_id_school') giga_id_school: string,
  ): Promise<ApiSuccessResponseDto<SchoolDto[]>> {
    try {
      const schools = await this.schoolService.schoolsByGigaId(
        giga_id_school.toLowerCase(),
      );

      return {
        success: true,
        data: schools,
        timestamp: new Date().toISOString(),
        message: 'success',
      };
    } catch (error) {
      throw new HttpException('Failed to get schools', HttpStatus.BAD_REQUEST);
    }
  }

  @Get('id/:id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Returns the list of schools on the Daily Check App database by id',
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
  @ApiParam({
    name: 'id',
    description: 'The id of school',
    required: true,
    type: 'string',
  })
  async getSchoolsById(
    @Param('id') id: string,
  ): Promise<ApiSuccessResponseDto<SchoolDto[]>> {
    try {
      const schools = await this.schoolService.schoolsById(id);

      return {
        success: true,
        data: schools,
        timestamp: new Date().toISOString(),
        message: 'success',
      };
    } catch (error) {
      throw new HttpException('Failed to get schools', HttpStatus.BAD_REQUEST);
    }
  }

  @Get('country_id/:country_id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Returns the list of schools on the Daily Check App database by country id',
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
  @ApiParam({
    name: 'country_id',
    description: 'The country id',
    required: true,
    type: 'string',
  })
  async getSchoolsByCountryId(
    @Param('country_id') country_id: string,
  ): Promise<ApiSuccessResponseDto<SchoolDto[]>> {
    try {
      const schools = await this.schoolService.schoolsByCountryId(
        country_id.toUpperCase(),
      );

      return {
        success: true,
        data: schools,
        timestamp: new Date().toISOString(),
        message: 'success',
      };
    } catch (error) {
      throw new HttpException('Failed to get schools', HttpStatus.BAD_REQUEST);
    }
  }

  @Post()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Register a school in to the Daily Check App database',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns Id of school created',
    type: String,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized; Invalid api key provided',
  })
  async createSchools(
    @Body() schoolDto: SchoolDto,
  ): Promise<ApiSuccessResponseDto<string>> {
    try {
      const schoolId = await this.schoolService.createSchool(schoolDto);

      return {
        success: true,
        data: schoolId,
        timestamp: new Date().toISOString(),
        message: 'success',
      };
    } catch (error) {
      throw new HttpException(
        'Failed to create school',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
