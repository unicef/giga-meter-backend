import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  ContentStatus,
  SaveContentDto,
  ContentResponseDto,
} from '../dto/content.dto';
import redisClient from 'src/utils/redis.client';
import { CMS_DATA_CACHE_KEY } from 'src/config/cache.config';

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

  async getCachedPublishedContent(): Promise<ContentResponseDto> {
    try {
      const cachedData = await redisClient.get(CMS_DATA_CACHE_KEY);
      if (cachedData) {
        this.logger.log('Returning CMS content from cache');
        return JSON.parse(cachedData);
      }

      const content = await this.getContent(ContentStatus.PUBLISHED);

      if (content && content.contentJson) {
        await redisClient.set(CMS_DATA_CACHE_KEY, JSON.stringify(content));
        this.logger.log('Stored CMS content in cache');
      }

      return content;
    } catch (error) {
      this.logger.error(`Error in getCachedPublishedContent: ${error.message}`);
      // Fallback to database if cache fails
      return this.getContent(ContentStatus.PUBLISHED);
    }
  }

  /**
   * Save or update content
   */
  async saveContent(
    saveContentDto: SaveContentDto,
    status: ContentStatus,
    userId?: number,
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
          ...(userId && { updatedById: userId }),
          ...(isPublishing && { publishedAt: new Date() }),
        },
        create: {
          status,
          contentJson,
          ...(userId && { createdById: userId }),
          ...(isPublishing && { publishedAt: new Date() }),
        },
      });

      // If publishing, remove draft data and invalidate cache
      if (isPublishing) {
        await this.prisma.cmsContent.deleteMany({
          where: { status: ContentStatus.DRAFT },
        });
        await redisClient.del(CMS_DATA_CACHE_KEY);
        this.logger.log(
          'Removed draft content and invalidated cache after publishing',
        );
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
