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
import { AuthGuard } from '../auth/auth.guard';
import { ApiSuccessResponseDto } from '../common/common.dto';
import { FlaggedSchoolDto } from './flagged-school.dto';
import { Countries, WriteAccess } from '../common/common.decorator';

@ApiTags('Flagged Schools')
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
    type: FlaggedSchoolDto,
    isArray: true,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized; Invalid api key provided',
  })
  @ApiQuery({
    name: 'size',
    description: 'The number of flagged schools to return, default: 10',
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
    @WriteAccess() write_access?: boolean,
    @Countries() countries?: string[],
  ): Promise<ApiSuccessResponseDto<FlaggedSchoolDto[]>> {
    const flaggedSchools = await this.schoolService.schools({
      skip: (page ?? 0) * (size ?? 10),
      take: (size ?? 10) * 1,
      write_access,
      countries,
    });

    return {
      success: true,
      data: flaggedSchools,
      timestamp: new Date().toISOString(),
      message: 'success',
    };
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
    type: FlaggedSchoolDto,
    isArray: true,
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
    @WriteAccess() write_access?: boolean,
    @Countries() countries?: string[],
  ): Promise<ApiSuccessResponseDto<FlaggedSchoolDto[]>> {
    if (
      !write_access &&
      !countries?.includes(country_id.trim().toUpperCase())
    ) {
      throw new HttpException(
        'not authorized to access',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!country_id || country_id.trim().length === 0)
      throw new HttpException(
        'country_id is null/empty',
        HttpStatus.BAD_REQUEST,
      );

    const flaggedSchools = await this.schoolService.schoolsByCountryId(
      country_id.toUpperCase(),
    );

    return {
      success: true,
      data: flaggedSchools,
      timestamp: new Date().toISOString(),
      message: 'success',
    };
  }

  @Post()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Register a flagged school in to the Daily Check App database',
  })
  @ApiResponse({
    status: 201,
    description: 'Returns Id of flagged school created',
    type: String,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized; Invalid api key provided',
  })
  async createSchool(
    @Body() schoolDto: FlaggedSchoolDto,
  ): Promise<ApiSuccessResponseDto<string>> {
    const schoolId = await this.schoolService.createSchool(schoolDto);

    return {
      success: true,
      data: schoolId,
      timestamp: new Date().toISOString(),
      message: 'success',
    };
  }
}
