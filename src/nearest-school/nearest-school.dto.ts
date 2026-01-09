import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty, IsDefined, Min, Max } from 'class-validator';

export class FindNearestSchoolDto {
  @ApiProperty({
    description: 'Latitude of the location',
    required: true,
  })
  @IsDefined()
  @IsNumber()
  @IsNotEmpty()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({
    description: 'Longitude of the location',
    required: true,
  })
  @IsDefined()
  @IsNumber()
  @IsNotEmpty()
  @Min(-180)
  @Max(180)
  longitude: number;
}

export class NearestSchoolResponseDto {
  @ApiProperty({
    description: 'School ID',
    required: true,
  })
  id: string;

  @ApiProperty({
    description: 'School name',
    required: true,
  })
  name: string;

  @ApiProperty({
    description: 'GIGA ID of the school',
    required: true,
  })
  giga_id_school: string;

  @ApiProperty({
    description: 'School address',
    required: true,
  })
  address: string;

  @ApiProperty({
    description: 'Country code',
    required: true,
  })
  country_code: string;

  @ApiProperty({
    description: 'External ID of the school',
    required: true,
  })
  external_id: string;

  @ApiProperty({
    description: 'School latitude',
    required: true,
  })
  latitude: number;

  @ApiProperty({
    description: 'School longitude',
    required: true,
  })
  longitude: number;

  @ApiProperty({
    description: 'Distance from the provided location in meters',
    required: true,
  })
  distance_meters: number;
}

