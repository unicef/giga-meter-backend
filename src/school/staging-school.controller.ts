import {
  Body,
  Controller,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiExcludeController,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SchoolService } from './school.service';
import { StagingGuard } from '../common/staging.guard';
import { CreateSchoolDto, CreateSchoolResponseDto } from './create-school.dto';
import { ApiSuccessResponseDto } from '../common/common.dto';

/**
 * Staging-only endpoints for seeding the canonical `school` table.
 *
 * The whole controller is gated by {@link StagingGuard}: outside the staging
 * environment (NODE_ENV !== 'staging') every route responds with 404, so this
 * is never reachable in production. Excluded from Swagger for the same reason.
 */
@ApiTags('Schools (staging)')
@ApiExcludeController()
@Controller('api/v1/staging/schools')
@UseGuards(StagingGuard)
export class StagingSchoolController {
  constructor(private readonly schoolService: SchoolService) {}

  @Post()
  @UsePipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  )
  @ApiOperation({
    summary: 'Create a school in the canonical school table (staging only)',
  })
  @ApiResponse({
    status: 201,
    description: 'Returns the id of the created school',
    type: CreateSchoolResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Not found; endpoint is only available in staging',
  })
  async createSchool(
    @Body() dto: CreateSchoolDto,
  ): Promise<ApiSuccessResponseDto<CreateSchoolResponseDto>> {
    const id = await this.schoolService.createSchoolRecord(dto);

    return {
      success: true,
      data: { id },
      timestamp: new Date().toISOString(),
      message: 'success',
    };
  }
}
