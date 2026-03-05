import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { ContentService } from '../services/content.service';
import {
  GetContentQueryDto,
  SaveContentDto,
  SaveContentQueryDto,
  ContentResponseDto,
  ContentStatus,
} from '../dto/content.dto';
import { AdminLoggedInUser } from 'src/common/common.decorator';
import { Users } from '@prisma/client';
import { AdminAccess } from 'src/common/admin.decorator';
import { ApiExcludeController } from '@nestjs/swagger';
import { Roles } from 'src/admin-meter/roles/roles.decorator';
import { PERMISSION_SLUGS } from 'src/admin-meter/roles/roles.constants';

@ApiTags('CMS - Content Management')
@Controller('api/v1/cms/content')
@ApiExcludeController()
@AdminAccess()
export class ContentController {
  private readonly logger = new Logger(ContentController.name);

  constructor(
    private readonly contentService: ContentService,
  ) { }
  @Get()
  @ApiOperation({
    summary: 'Get content',
    description:
      'Retrieve content by status (draft/published).',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ContentStatus,
    description: 'Content status to retrieve',
  })
  @ApiResponse({
    status: 200,
    description: 'Content retrieved successfully',
    type: ContentResponseDto,
  })
  async getContent(
    @Query() query: GetContentQueryDto,
  ): Promise<ContentResponseDto> {
    this.logger.log(
      `Getting content - Status: ${query.status || 'draft'}`,
    );

    return this.contentService.getContent(
      query.status
    );
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Save/Update content',
    description:
      'Save content as draft or publish. Auto-increments version and creates snapshots on publish.',
  })
  @ApiQuery({
    name: 'status',
    required: true,
    enum: ContentStatus,
    description: 'Status to save content as (draft or published)',
  })
  @ApiResponse({
    status: 200,
    description: 'Content saved successfully',
    type: ContentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid content structure or validation failed',
  })
  @Roles(PERMISSION_SLUGS.CAN_ADD_CMS, PERMISSION_SLUGS.CAN_UPDATE_CMS)
  async saveContent(
    @AdminLoggedInUser() user: Users,
    @Query() query: SaveContentQueryDto,
    @Body() saveContentDto: SaveContentDto,
  ): Promise<ContentResponseDto> {
    this.logger.log(`Saving content with status: ${query.status}`);

    return this.contentService.saveContent(saveContentDto, query.status, user?.id);
  }
}
