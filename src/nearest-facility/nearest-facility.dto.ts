import { ApiProperty } from '@nestjs/swagger';
import {
  IsDefined,
  IsIn,
  IsNotEmpty,
  IsNumber,
  Max,
  Min,
} from 'class-validator';

export class FindNearestFacilityDto {
  @ApiProperty({ description: 'Latitude of the search location', example: -1.2921 })
  @IsDefined()
  @IsNumber()
  @IsNotEmpty()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ description: 'Longitude of the search location', example: 36.8219 })
  @IsDefined()
  @IsNumber()
  @IsNotEmpty()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiProperty({
    description: 'Entity type to search — "school" or "health"',
    enum: ['school', 'health'],
    example: 'health',
  })
  @IsDefined()
  @IsNotEmpty()
  @IsIn(['school', 'health'])
  entity_type: 'school' | 'health';
}

export class NearestFacilityResponseDto {
  @ApiProperty({ description: 'Internal ID (as string)' })
  id: string;

  @ApiProperty({ description: 'Facility name' })
  name: string;

  @ApiProperty({ description: 'Giga-assigned UUID (giga_id_school or health_id_giga)' })
  giga_id: string;

  @ApiProperty({ enum: ['school', 'health'], description: 'Entity type name' })
  entity_type: 'school' | 'health';

  @ApiProperty({ description: 'Facility latitude' })
  latitude: number;

  @ApiProperty({ description: 'Facility longitude' })
  longitude: number;

  @ApiProperty({ description: 'ISO-2 country code' })
  country_code: string;

  @ApiProperty({ required: false, description: 'Street address (school only)' })
  address?: string;

  @ApiProperty({ description: 'Distance from the provided coordinates in meters' })
  distance_meters: number;
}
