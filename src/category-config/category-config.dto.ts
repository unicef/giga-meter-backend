import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class ApiEndpointDto {
  @ApiProperty({ description: 'URL pattern for the API endpoint' })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiProperty({ description: 'HTTP methods allowed or not allowed for this endpoint', type: [String] })
  @IsArray()
  methods: string[];
}

export class ResponseFiltersDto {
  @ApiProperty({ description: 'Fields to include (if specified, all other fields are excluded)', type: [String], required: false })
  @IsArray()
  @IsOptional()
  include?: string[];

  @ApiProperty({ description: 'Fields to exclude (if include is not specified)', type: [String], required: false })
  @IsArray()
  @IsOptional()
  exclude?: string[];

  @ApiProperty({ description: 'Path-specific field filters', required: false })
  @IsObject()
  @IsOptional()
  endpoints?: Record<string, { include?: string[]; exclude?: string[] }>;
}

export class SwaggerConfigDto {
  @ApiProperty({ description: 'Whether this category\'s Swagger docs should be available' })
  @IsBoolean()
  visible: boolean;

  @ApiProperty({ description: 'Custom title for this category\'s Swagger docs', required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ description: 'Custom description for this category\'s Swagger docs', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateCategoryConfigDto {
  @ApiProperty({ description: 'Category name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Whether this is the default category', default: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiProperty({ description: 'List of allowed API endpoints', type: [ApiEndpointDto], required: false, default: null })
  @IsArray()
  @IsOptional()
  allowedAPIs?: ApiEndpointDto[];

  @ApiProperty({ description: 'List of not allowed API endpoints', type: [ApiEndpointDto], required: false, default: null })
  @IsArray()
  @IsOptional()
  notAllowedAPIs?: ApiEndpointDto[];

  @ApiProperty({ description: 'Response filtering configuration', required: false })
  @IsObject()
  @IsOptional()
  responseFilters?: ResponseFiltersDto;

  @ApiProperty({ description: 'Swagger documentation configuration' })
  @IsObject()
  swagger: SwaggerConfigDto;

  @ApiProperty({ description: 'ISO country codes allowed for this category', type: [String], required: false, default: null })
  @IsArray()
  @IsOptional()
  allowedCountries?: string[];
}

export class UpdateCategoryConfigDto extends CreateCategoryConfigDto {}

export class CategoryConfigDto extends CreateCategoryConfigDto {
  @ApiProperty({ description: 'Category configuration ID' })
  id: number;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

export class AllowedCountriesDto {
  @ApiProperty({ description: 'Category name' })
  category: string;

  @ApiProperty({ description: 'List of allowed country codes', type: [String] })
  allowedCountries: string[];
}
