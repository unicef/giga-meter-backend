import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { MeasurementProvider } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class CountryConfigDto {
  @ApiProperty({
    description: 'Unique identifier of the country configuration',
  })
  id: number;

  @ApiProperty({
    description: 'ISO country code associated with the configuration',
  })
  countryCode: string;

  @ApiProperty({
    description: 'Measurement provider that should be used for the country',
    enum: MeasurementProvider,
    default: MeasurementProvider.mlab,
  })
  measurementProvider: MeasurementProvider;

  @ApiPropertyOptional({
    description: 'Optional provider-specific settings',
    type: Object,
  })
  options?: Record<string, unknown> | null;

  @ApiProperty({ description: 'Creation timestamp in ISO 8601 format' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp in ISO 8601 format' })
  updatedAt: Date;
}

export class CreateCountryConfigDto {
  @ApiProperty({
    description:
      'ISO country code that must already exist in the country table',
  })
  @IsString()
  @IsNotEmpty()
  countryCode: string;

  @ApiPropertyOptional({
    description:
      'Measurement provider to persist; defaults to M-Lab when omitted',
    enum: MeasurementProvider,
    default: MeasurementProvider.mlab,
  })
  @IsOptional()
  @IsEnum(MeasurementProvider)
  measurementProvider?: MeasurementProvider;

  @ApiPropertyOptional({
    description: 'Optional JSON object with provider-specific options',
    type: Object,
  })
  @IsOptional()
  @IsObject()
  options?: Record<string, unknown>;
}

export class UpdateCountryConfigDto extends PartialType(
  CreateCountryConfigDto,
) {}

export class PaginatedCountryConfigDto {
  @ApiProperty({
    description:
      'List of country configurations returned for the requested page',
    type: CountryConfigDto,
    isArray: true,
  })
  items: CountryConfigDto[];

  @ApiProperty({ description: 'Total number of stored country configurations' })
  total: number;

  @ApiProperty({
    description: 'Zero-based page index returned in this response',
    default: 0,
  })
  page: number;

  @ApiProperty({
    description: 'Maximum number of country configurations per page',
    default: 10,
  })
  size: number;
}
