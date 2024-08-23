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
import { SchoolMasterService } from './school-master.service';
import { AuthGuard } from '../auth/auth.guard';
import {
  AddRecordResponseDto,
  ApiSuccessResponseDto,
} from '../common/common.dto';
import { SchoolMasterDto } from './school-master.dto';
import { Countries, WriteAccess } from '../common/common.decorator';

@ApiTags('SchoolsMaster')
@Controller('api/v1/schools')
export class SchoolMasterController {
  constructor(private readonly schoolService: SchoolMasterService) {}

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
    type: SchoolMasterDto,
    isArray: true,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized; Invalid api key provided',
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
    @WriteAccess() write_access?: boolean,
    @Countries() countries?: string[],
  ): Promise<ApiSuccessResponseDto<SchoolMasterDto[]>> {
    try {
      const schools = await this.schoolService.schools(
        (page ?? 0) * (size ?? 10),
        (size ?? 10) * 1,
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
      throw new HttpException(
        'Failed to get schools with ' + error,
        HttpStatus.BAD_REQUEST,
      );
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
    type: SchoolMasterDto,
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
  ): Promise<ApiSuccessResponseDto<SchoolMasterDto[]>> {
    try {
      if (!id || id.trim().length === 0)
        throw new HttpException('id is null/empty', HttpStatus.BAD_REQUEST);

      const schools = await this.schoolService.schoolsById(id);

      return {
        success: true,
        data: schools,
        timestamp: new Date().toISOString(),
        message: 'success',
      };
    } catch (error) {
      throw new HttpException(
        'Failed to get schools with ' + error,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Register a school in to the Daily Check App database',
  })
  @ApiResponse({
    status: 201,
    description: 'Returns Id of school created',
    type: String,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized; Invalid api key provided',
  })
  async createSchool(
    @Body() schoolDto: SchoolMasterDto,
  ): Promise<ApiSuccessResponseDto<AddRecordResponseDto>> {
    try {
      const schoolId = await this.schoolService.createSchool(schoolDto);

      return {
        success: true,
        data: { user_id: schoolId },
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
