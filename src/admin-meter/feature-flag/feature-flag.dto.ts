import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class FeatureFlagListingDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  page = 1;

  @ApiPropertyOptional({ description: 'Number of items per page', default: 20 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  limit = 20;

  @ApiPropertyOptional({ description: 'Search term to filter by name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by a specific feature flag ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  feature_id?: number;
}

export class CreateFeatureFlagDto {
  @ApiProperty({ description: 'The name of the feature flag' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'A description of what the feature does',
  })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateFeatureFlagDto {
  @ApiProperty({ description: 'The desired state of the feature flag' })
  @IsBoolean()
  is_active: boolean;
}
