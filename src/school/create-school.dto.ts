import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

/**
 * Input payload for creating a record in the canonical `school` table.
 *
 * Only used by the staging-only school creation endpoint. `name` is the only
 * required field; everything else is optional and mirrors the columns of the
 * `school` model. `latitude`/`longitude` are translated into the PostGIS
 * `geopoint` column server-side.
 */
export class CreateSchoolDto {
  @ApiProperty({ description: 'School name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'IANA timezone, eg: Asia/Kolkata' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Latitude of the school location (WGS84). Stored in geopoint.',
  })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({
    description:
      'Longitude of the school location (WGS84). Stored in geopoint.',
  })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({ description: 'Confidence of the GPS coordinates' })
  @IsOptional()
  @IsNumber()
  gps_confidence?: number;

  @ApiPropertyOptional({ description: 'Altitude in meters' })
  @IsOptional()
  @IsInt()
  altitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  postal_code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  education_level?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  environment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  school_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  country_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  location_id?: number;

  @ApiPropertyOptional({ description: 'ISO2 country code, eg: IN' })
  @IsOptional()
  @IsString()
  country_code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  admin_1_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  admin_2_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  admin_3_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  admin_4_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  external_id?: string;

  @ApiPropertyOptional({ description: 'The GIGA id of the school' })
  @IsOptional()
  @IsString()
  giga_id_school?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  education_level_regional?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  feature_flags?: Record<string, unknown>;
}

export class CreateSchoolResponseDto {
  @ApiProperty({ description: 'Id of the created school record' })
  id: string;
}
