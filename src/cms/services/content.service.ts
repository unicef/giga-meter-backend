import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ContentStatus,
  SaveContentDto,
  ContentResponseDto,
} from '../dto/content.dto';

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get content by status (draft or published)
   */
  async getContent(status?: ContentStatus): Promise<ContentResponseDto> {
    const contentStatus = status || ContentStatus.DRAFT;
    
    const content = await this.prisma.cmsContent.findUnique({
      where: { status: contentStatus },
    });

    if (!content) {
      return {
        status: contentStatus,
        contentJson: null,
      };
    }

    return this.mapToContentResponse(content);
  }

  /**
   * Save or update content
   */
  async saveContent(
    saveContentDto: SaveContentDto,
    status: ContentStatus,
  ): Promise<ContentResponseDto> {
    try {
      this.logger.log(`Saving content with status: ${status}`);

      const contentJson = saveContentDto?.contentJson;

      if (contentJson === undefined || contentJson === null) {
        throw new BadRequestException('contentJson is required');
      }

      const isPublishing = status === ContentStatus.PUBLISHED;

      // Upsert content record
      const content = await this.prisma.cmsContent.upsert({
        where: { status },
        update: {
          contentJson,
          lastModified: new Date(),
          ...(isPublishing && { publishedAt: new Date() }),
        },
        create: {
          status,
          contentJson,
          ...(isPublishing && { publishedAt: new Date() }),
        },
      });

      // If publishing, remove draft data
      if (isPublishing) {
        await this.prisma.cmsContent.deleteMany({
          where: { status: ContentStatus.DRAFT },
        });
        this.logger.log('Removed draft content after publishing');
      }

      this.logger.log(`Content saved successfully. Status: ${status}`);

      return this.mapToContentResponse(content);
    } catch (error) {
      this.logger.error(`Failed to save content: ${error.message}`);
      throw error;
    }
  }

  /**
   * Map database record to response DTO
   */
  private mapToContentResponse(content: any): ContentResponseDto {
    return {
      id: content.id,
      status: content.status,
      contentJson: content.contentJson,
      publishedAt: content.publishedAt,
      lastModified: content.lastModified,
      createdAt: content.createdAt,
    };
  }
}
