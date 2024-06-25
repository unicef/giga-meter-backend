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
import { FlaggedSchoolService } from './flagged-school.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { ApiSuccessResponseDto } from 'src/common/common.dto';
import { FlaggedSchoolDto } from './flagged-school.dto';

@ApiTags('flagged_dailycheckapp_schools')
@Controller('api/v1/flagged_dailycheckapp_schools')
export class FlaggedSchoolController {
  constructor(private readonly schoolService: FlaggedSchoolService) {}

  @Get('')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Returns the list of flagged schools on the Daily Check App database',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the list of flagged schools',
    type: ApiSuccessResponseDto<FlaggedSchoolDto[]>,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized; Invalid api key provided',
  })
  @ApiQuery({
    name: 'size',
    description: 'The number of flagged schools to return',
    required: false,
    type: 'number',
  })
  @ApiQuery({
    name: 'page',
    description:
      'The number of pages to skip before starting to collect the result, eg: if page=2 and size=10, it will skip 20 (2*10) records',
    required: false,
    type: 'number',
  })
  async getSchools(
    @Query('page') page?: number,
    @Query('size') size?: number,
  ): Promise<ApiSuccessResponseDto<FlaggedSchoolDto[]>> {
    try {
      const flaggedSchools = await this.schoolService.schools({
        skip: (page ?? 0) * (size ?? 10),
        take: (size ?? 10) * 1,
      });

      return {
        success: true,
        data: flaggedSchools,
        timestamp: new Date().toISOString(),
        message: 'success',
      };
    } catch (error) {
      throw new HttpException('Failed to get schools', HttpStatus.BAD_REQUEST);
    }
  }

  @Get('/:country_id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Returns the list of flagged schools on the Daily Check App database by country id',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the list of flagged schools',
    type: ApiSuccessResponseDto<FlaggedSchoolDto[]>,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized; Invalid api key provided',
  })
  @ApiParam({
    name: 'country_id',
    description: 'The number of flagged schools to return',
    required: true,
    type: 'string',
  })
  async getSchoolsByCountryId(
    @Param('country_id') country_id: string,
  ): Promise<ApiSuccessResponseDto<FlaggedSchoolDto[]>> {
    try {
      const flaggedSchools =
        await this.schoolService.schoolsByCountryId(country_id);

      return {
        success: true,
        data: flaggedSchools,
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
    summary: 'Register a flagged school in to the Daily Check App database',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns Id of flagged school created',
    type: ApiSuccessResponseDto<string>,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized; Invalid api key provided',
  })
  async createSchools(
    @Body() schoolDto: FlaggedSchoolDto,
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
