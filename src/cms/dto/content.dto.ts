import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsObject,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

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

export class ImageDto {
  @ApiProperty({ example: 'file_1700000000000' })
  @IsString()
  id: string;

  @ApiProperty({ example: 'Hero Image.jpg' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Main hero section image' })
  @IsOptional()
  @IsString()
  altText?: string;

  @ApiProperty({ example: '/content/media/1700000000000_hero.jpg' })
  @IsString()
  url: string;

  @ApiPropertyOptional({ example: 1920 })
  @IsOptional()
  @IsNumber()
  width?: number;

  @ApiPropertyOptional({ example: 1080 })
  @IsOptional()
  @IsNumber()
  height?: number;
}

export class SectionFieldDto {
  @ApiProperty({ example: 'title' })
  @IsString()
  key: string;

  @ApiProperty({ enum: ['text', 'image', 'list'], example: 'text' })
  @IsString()
  type: 'text' | 'image' | 'list';

  @ApiProperty({ example: true })
  @IsBoolean()
  required: boolean;

  @ApiPropertyOptional({ example: 'Section title' })
  @IsOptional()
  @IsString()
  label?: string;
}

export class SectionSchemaDto {
  @ApiProperty({ example: 'hero' })
  @IsString()
  id: string;

  @ApiProperty({ example: 'Hero Section' })
  @IsString()
  name: string;

  @ApiProperty({ type: [SectionFieldDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionFieldDto)
  fields: SectionFieldDto[];
}

export class SectionDataDto {
  @ApiProperty({ example: 'hero_1' })
  @IsString()
  id: string;

  @ApiProperty({ example: 'hero' })
  @IsString()
  schemaId: string;

  @ApiProperty({ example: { title: 'Welcome', subtitle: 'To our site' } })
  @IsObject()
  data: Record<string, any>;
}

export class PageContentDto {
  @ApiProperty({ example: 'home' })
  @IsString()
  page: string;

  @ApiProperty({ type: [SectionDataDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionDataDto)
  sections: SectionDataDto[];
}

export class SaveContentDto {
  @ApiProperty({ type: [PageContentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PageContentDto)
  pages: PageContentDto[];

  @ApiPropertyOptional({ example: 'Updated hero section' })
  @IsOptional()
  @IsString()
  changeDescription?: string;
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
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ enum: ContentStatus })
  status: ContentStatus;

  @ApiProperty()
  contentJson: any;

  @ApiPropertyOptional()
  publishedAt?: Date;

  @ApiProperty()
  lastModified: Date;

  @ApiProperty()
  createdAt: Date;
}
