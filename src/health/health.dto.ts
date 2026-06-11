import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

/** Brief shape returned by GET /api/v1/health (list endpoint). */
export class HealthListItemDto {
  @ApiProperty({ description: 'Internal numeric ID (as string)' })
  id: string;

  @ApiProperty({ description: 'Giga-assigned health facility UUID' })
  health_id_giga: string;

  @ApiProperty({ description: 'Official facility name' })
  facility_name: string;

  @ApiProperty({ required: false })
  facility_level?: string | null;

  @ApiProperty({ required: false })
  facility_type_govt?: string | null;

  @ApiProperty({ required: false })
  facility_ownership_govt?: string | null;

  @ApiProperty({ description: 'Latitude (WGS-84)' })
  latitude: number;

  @ApiProperty({ description: 'Longitude (WGS-84)' })
  longitude: number;

  @ApiProperty({ required: false })
  country_code?: string | null;

  @ApiProperty({ required: false })
  admin1?: string | null;

  @ApiProperty({ required: false })
  admin2?: string | null;

  @ApiProperty({ required: false })
  is_facility_open?: boolean | null;

  @ApiProperty({ required: false })
  connectivity?: string | null;

  @ApiProperty({ required: false })
  electricity_availability?: string | null;
}

/** Fuller shape returned by GET /api/v1/health/giga-id/:giga_id (detail endpoint). */
export class HealthDetailDto extends HealthListItemDto {
  @ApiProperty({ required: false })
  dhis2_id?: string | null;

  @ApiProperty({ required: false })
  num_staff?: number | null;

  @ApiProperty({ required: false })
  pop_within_5km?: number | null;
}

/** Query params for GET /api/v1/health */
export class GetHealthListQueryDto {
  @ApiProperty({ required: false, description: 'Filter by country code, e.g. KE' })
  @IsOptional()
  @IsString()
  country_code?: string;

  @ApiProperty({ required: false, description: 'Zero-based page offset', default: 0 })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiProperty({ required: false, description: 'Results per page (max 100)', default: 10 })
  @IsOptional()
  @IsNumber()
  size?: number;

  @ApiProperty({
    required: false,
    description: 'Column to sort by; prefix "-" for DESC, e.g. "-facility_name"',
  })
  @IsOptional()
  @IsString()
  orderBy?: string;
}
