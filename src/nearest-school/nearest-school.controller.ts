import {
    Controller,
    Post,
    Body,
    HttpException,
    HttpStatus,
    UseGuards,
  } from '@nestjs/common';
  import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBody,
    ApiBearerAuth,
  } from '@nestjs/swagger';
  import { NearestSchoolService } from './nearest-school.service';
  import { FindNearestSchoolDto, NearestSchoolResponseDto } from './nearest-school.dto';
  import { AuthGuard } from '../auth/auth.guard';
  import { ApiSuccessResponseDto } from '../common/common.dto';
  import { Public } from '../common/public.decorator';
  
  @ApiTags('nearest-school')
  @Controller('api/v1/nearest-school')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  export class NearestSchoolController {
    constructor(private readonly nearestSchoolService: NearestSchoolService) {}
  
    @Public()
    @Post()
    @ApiOperation({ summary: 'Find the nearest school within 1km of the provided coordinates' })
    @ApiBody({ type: FindNearestSchoolDto })
    @ApiResponse({ status: 200, description: 'Location data retrieved successfully' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    async findNearestSchool(
      @Body() findNearestSchoolDto: FindNearestSchoolDto,
    ): Promise<ApiSuccessResponseDto<NearestSchoolResponseDto>> {
      const nearestSchool = await this.nearestSchoolService.findNearestSchool(
        findNearestSchoolDto.latitude,
        findNearestSchoolDto.longitude,
      );
  
      return {
        success: true,
        data: nearestSchool,
        timestamp: new Date().toISOString(),
        message: 'success',
      };
    }
  }