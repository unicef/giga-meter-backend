import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Query,
  Body,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { MediaService } from '../services/media.service';
import {
  UploadFileDto,
  UpdateFileMetadataDto,
  DeleteFileQueryDto,
  MediaLibraryResponseDto,
  MediaResponseDto,
  UploadFileResponseDto,
} from '../dto/media.dto';
import { Public } from 'src/common/public.decorator';

@Public()
@ApiTags('CMS - Media Management')
@Controller('api/v1/cms/media')
export class MediaController {
  private readonly logger = new Logger(MediaController.name);

  constructor(private readonly mediaService: MediaService) {}

  @Get()
  @ApiOperation({
    summary: 'Get media library',
    description: 'Retrieve all media files (images, videos, documents)',
  })
  @ApiResponse({
    status: 200,
    description: 'Media library retrieved successfully',
    type: MediaLibraryResponseDto,
  })
  async getMediaLibrary(): Promise<MediaLibraryResponseDto> {
    this.logger.log('Getting media library');
    return this.mediaService.getMediaLibrary();
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload file',
    description:
      'Upload a new file. Supports images (JPEG, PNG, WebP, SVG, GIF, etc.), videos (MP4, WebM, MOV), and documents (PDF, Excel, PowerPoint, Word).',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload (image, video, or document)',
        },
        name: {
          type: 'string',
          description: 'Custom name for the file (optional, defaults to original filename)',
          example: 'Giga Meter logo',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'File uploaded successfully',
    type: UploadFileResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file or file size exceeds limit',
  })
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 100 * 1024 * 1024 }), // 100MB max
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
    @Body() body: UploadFileDto,
  ): Promise<UploadFileResponseDto> {
    this.logger.log(
      `Uploading file: ${file.originalname} (${file.mimetype})`,
    );

    const uploadedFile = await this.mediaService.uploadFile(file, body.name);

    return {
      success: true,
      file: uploadedFile,
      message: 'File uploaded successfully',
    };
  }

  @Patch()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update file metadata',
    description: 'Update file name, alt text, or usage information',
  })
  @ApiResponse({
    status: 200,
    description: 'File metadata updated successfully',
    type: MediaResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'File not found',
  })
  async updateFileMetadata(
    @Body() updateDto: UpdateFileMetadataDto,
  ): Promise<MediaResponseDto> {
    this.logger.log(`Updating metadata for file: ${updateDto.id}`);
    return this.mediaService.updateFileMetadata(updateDto);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete file',
    description:
      'Delete a file. Returns error if file is used in any section.',
  })
  @ApiQuery({
    name: 'id',
    required: true,
    type: String,
    description: 'File ID to delete',
  })
  @ApiResponse({
    status: 204,
    description: 'File deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'File is used in sections and cannot be deleted',
  })
  @ApiResponse({
    status: 404,
    description: 'File not found',
  })
  async deleteFile(@Query() query: DeleteFileQueryDto): Promise<void> {
    this.logger.log(`Deleting file: ${query.id}`);
    await this.mediaService.deleteFile(query.id);
  }
}
