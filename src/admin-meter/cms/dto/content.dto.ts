import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsObject } from 'class-validator';

export enum ContentStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

export class GetContentQueryDto {
  @ApiPropertyOptional({
    enum: ContentStatus,
    description: 'Content status to retrieve (draft or published)',
    default: ContentStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;
}

export class SaveContentDto {
  @ApiProperty({
    description: 'Content JSON data to save',
    example: { pages: [], settings: {} },
  })
  @IsObject()
  contentJson: Record<string, any>;
}

export class SaveContentQueryDto {
  @ApiProperty({
    enum: ContentStatus,
    description: 'Status to save content as',
    default: ContentStatus.DRAFT,
  })
  @IsEnum(ContentStatus)
  status: ContentStatus;
}

export class ContentResponseDto {
  @ApiPropertyOptional({ example: 1 })
  id?: number;

  @ApiProperty({ enum: ContentStatus })
  status: ContentStatus;

  @ApiPropertyOptional()
  contentJson: any;

  @ApiPropertyOptional()
  publishedAt?: Date;

  @ApiPropertyOptional()
  lastModified?: Date;

  @ApiPropertyOptional()
  createdAt?: Date;
}
