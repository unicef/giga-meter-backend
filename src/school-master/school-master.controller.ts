import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SchoolMasterService } from './school-master.service';
import { AuthGuard } from '../auth/auth.guard';
import { ApiSuccessResponseDto } from '../common/common.dto';
import {
  FeatureFlagDto,
  SchoolFlagsDto,
  SchoolMasterDto,
} from './school-master.dto';

@ApiTags('SchoolsMaster')
@Controller('api/v1/schools')
export class SchoolMasterController {
  constructor(private readonly schoolService: SchoolMasterService) {}

  @Get('country_code_school_id/:country_code/:school_id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Returns the list of schools registered on the Giga Meter database filtered by country_code and school_id',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the list of schools',
    type: SchoolMasterDto,
    isArray: true,
  })
  @ApiParam({
    name: 'school_id',
    description: 'The external id of school',
    required: true,
    type: 'string',
  })
  @ApiParam({
    name: 'country_code',
    description: 'The country code',
    required: true,
    type: 'string',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized; Invalid api key provided',
  })
  async checkSchool(
    @Param('country_code') country_code: string,
    @Param('school_id') school_id: string,
  ): Promise<ApiSuccessResponseDto<SchoolMasterDto[]>> {
    if (!country_code || country_code.trim().length === 0)
      throw new HttpException(
        'country_code is null/empty',
        HttpStatus.BAD_REQUEST,
      );
    if (!school_id || school_id.trim().length === 0)
      throw new HttpException(
        'school_id is null/empty',
        HttpStatus.BAD_REQUEST,
      );

    const response = await this.schoolService.checkSchool(
      country_code,
      school_id,
    );

    return {
      success: true,
      data: response,
      timestamp: new Date().toISOString(),
      message: '',
    };
  }

  @Get('features_flags/:giga_id_school')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Returns the feature flags for a school on the Giga Meter database by giga school id',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the feature flags for a school',
    type: FeatureFlagDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized; Invalid api key provided',
  })
  @ApiParam({
    name: 'giga_id_school',
    description: 'The giga id of school',
    required: true,
    type: 'string',
  })
  async getFlagsByGigaId(
    @Param('giga_id_school') giga_id_school: string,
  ): Promise<ApiSuccessResponseDto<FeatureFlagDto>> {
    if (!giga_id_school || giga_id_school.trim().length === 0)
      throw new HttpException(
        'giga_id_school is null/empty',
        HttpStatus.BAD_REQUEST,
      );

    const flags = await this.schoolService.flagsByGigaId(giga_id_school);

    return {
      success: true,
      data: flags,
      timestamp: new Date().toISOString(),
      message: 'success',
    };
  }

  @Put('features_flags/:giga_id_school')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Set feature flags for a school in to the Giga Meter database',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns true/false',
    type: String,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized; Invalid api key provided',
  })
  @ApiParam({
    name: 'giga_id_school',
    description: 'The giga id of school',
    required: true,
    type: 'string',
  })
  async setFlagsByGigaId(
    @Param('giga_id_school') giga_id_school: string,
    @Body() featureFlagDto: FeatureFlagDto,
  ): Promise<ApiSuccessResponseDto<boolean>> {
    if (!giga_id_school || giga_id_school.trim().length === 0)
      throw new HttpException(
        'giga_id_school is null/empty',
        HttpStatus.BAD_REQUEST,
      );

    const response = await this.schoolService.setFlagsByGigaId(
      giga_id_school,
      featureFlagDto,
    );

    return {
      success: true,
      data: response,
      timestamp: new Date().toISOString(),
      message: 'success',
    };
  }
  @Put('features_flags')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Set feature flags for multiple schools in to the Giga Meter database',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the list of updated schools with their flags',
    type: SchoolFlagsDto,
  })
  async setManyFlagsByGigaId(
    @Body('giga_school_ids') giga_school_ids: string[],
    @Body('featureFlags') featureFlags: FeatureFlagDto,
  ): Promise<ApiSuccessResponseDto<SchoolFlagsDto[]>> {
    const response = await this.schoolService.updateSetFlagOnSchools(
      giga_school_ids,
      featureFlags,
    );
    if (response === false) {
      return {
        success: false,
        data: [],
        timestamp: new Date().toISOString(),
        message: 'No schools found for the provided giga_ids',
      };
    }

    return {
      success: true,
      data: response,
      timestamp: new Date().toISOString(),
      message: 'success',
    };
  }
}
