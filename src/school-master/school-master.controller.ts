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
import { FeatureFlagDto, SchoolMasterDto } from './school-master.dto';

@ApiTags('SchoolsMaster')
@Controller('api/v1/schools')
export class SchoolMasterController {
  constructor(private readonly schoolService: SchoolMasterService) {}

  @Get('country_code_school_id/:country_code/:school_id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Returns true/false if the school is registered on the Daily Check App database',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the true/false',
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
    description: 'Country code',
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
    try {
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
    } catch (error) {
      throw new HttpException(
        'Failed to check school with ' + error,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('features_flags/:giga_id_school')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Returns the feature flags for a school on the Daily Check App database by giga school id',
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
    try {
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
    } catch (error) {
      throw new HttpException(
        'Failed to get feature flags with ' + error,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Put('features_flags/:giga_id_school')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Set feature flags for a school in to the Daily Check App database',
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
    try {
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
    } catch (error) {
      throw new HttpException(
        'Failed to create school with ' + error,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
