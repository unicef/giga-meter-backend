import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
} from 'class-validator';

export class UploadFileDto {
  @ApiPropertyOptional({
    description: 'Custom name for the file (optional, defaults to original filename)',
    example: 'Giga meter logo',
  })
  @IsOptional()
  @IsString()
  name?: string;
}

export class UpdateFileMetadataDto {
  @ApiProperty({
    description: 'File ID to update',
    example: 'file_1700000000000',
  })
  @IsString()
  id: string;

  @ApiPropertyOptional({
    description: 'File name',
    example: 'Giga meter logo',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Alt text for accessibility (for images/videos)',
    example: 'Beautiful landscape background',
  })
  @IsOptional()
  @IsString()
  altText?: string;
}

export class DeleteFileQueryDto {
  @ApiProperty({
    description: 'File ID to delete',
    example: 'file_1700000000000',
  })
  @IsString()
  id: string;
}

export class MediaResponseDto {
  @ApiProperty({ example: 'file_1700000000000' })
  id: string;

  @ApiProperty({ example: 'GigaMeterLogo.svg' })
  name: string;

  @ApiPropertyOptional({ example: 'Corporate annual report' })
  altText?: string;

  @ApiProperty({ example: 'application/pdf' })
  fileType: string;

  @ApiProperty({ example: 2048576 })
  fileSize: number;

  @ApiProperty({ example: '/content/media/1700000000000_report.pdf' })
  filePath: string;

  @ApiProperty({ example: 'https://storage.azure.com/...' })
  url: string;

  @ApiPropertyOptional({ example: 1920 })
  width?: number;

  @ApiPropertyOptional({ example: 1080 })
  height?: number;

  @ApiPropertyOptional({ example: 120 })
  duration?: number; // For videos, in seconds

  @ApiProperty()
  uploadedAt: Date;
}

export class MediaLibraryResponseDto {
  @ApiProperty({ type: [MediaResponseDto] })
  files: MediaResponseDto[];

  @ApiProperty({ example: 10 })
  total: number;
}

export class UploadFileResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  file: MediaResponseDto;

  @ApiPropertyOptional()
  message?: string;
}
