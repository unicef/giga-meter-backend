import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SchemaValidationService } from './schema-validation.service';
import {
  ContentStatus,
  SaveContentDto,
  ContentResponseDto,
} from '../dto/content.dto';

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly schemaValidationService: SchemaValidationService,
  ) {}

  /**
   * Get content by status (draft or published)
   */
  async getContent(
    status?: ContentStatus,
  ): Promise<ContentResponseDto> {
    try {
      // Load from database
      const contentStatus = status || ContentStatus.DRAFT;
      const content = await this.prisma.cmsContent.findUnique({
        where: { status: contentStatus },
      });

      if (!content) {
        throw new NotFoundException(
          `No ${contentStatus} content found. Please create content first.`,
        );
      }

      return this.formatResponse(
        content.contentJson,
        contentStatus,
        content,
      );
    } catch (error) {
      this.logger.error(`Failed to get content: ${error.message}`);
      throw error;
    }
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

      // Validate content structure
      const contentJson = this.buildContentStructure(saveContentDto);

      // Validate against schemas
      const schemaMap =
        this.schemaValidationService.buildSchemaMap(contentJson);
      this.schemaValidationService.validateContent(
        contentJson.pages,
        schemaMap,
      );

      // Get or create content record
      let content = await this.prisma.cmsContent.findUnique({
        where: { status },
      });

      const isPublishing = status === ContentStatus.PUBLISHED;

      if (content) {
        // Update existing content
        content = await this.prisma.cmsContent.update({
          where: { status },
          data: {
            contentJson,
            lastModified: new Date(),
            ...(isPublishing && { publishedAt: new Date() }),
          },
        });
      } else {
        // Create new content
        content = await this.prisma.cmsContent.create({
          data: {
            status,
            contentJson,
            ...(isPublishing && { publishedAt: new Date() }),
          },
        });
      }

      this.logger.log(
        `Content saved successfully. Status: ${status}`,
      );

      return this.mapToContentResponse(content);
    } catch (error) {
      this.logger.error(`Failed to save content: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Build content structure from DTO
   */
  private buildContentStructure(dto: SaveContentDto): any {
    // For now, we assume the DTO already contains the full structure
    // In a real implementation, you might need to merge with existing schemas
    return {
      pages: dto.pages,
    };
  }

  /**
   * Format response based on flag
   */
  private formatResponse(
    contentJson: any,
    status: ContentStatus,
    dbContent?: any,
  ): ContentResponseDto {

    if (dbContent) {
      return this.mapToContentResponse(dbContent);
    }

    return {
      id: 0,
      status,
      contentJson,
      publishedAt: null,
      lastModified: new Date(),
      createdAt: new Date(),
    };
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
