import { ApiProperty } from '@nestjs/swagger';

export class FeatureFlagDto {
  @ApiProperty()
  feature_flag?: boolean;

  @ApiProperty()
  feature_flag_2?: boolean;
}

export class SchoolMasterDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name?: string;

  @ApiProperty()
  created?: Date;

  @ApiProperty()
  modified?: Date;

  @ApiProperty()
  timezone?: string;

  @ApiProperty()
  geopoint?: string;

  @ApiProperty()
  gps_confidence?: number;

  @ApiProperty()
  altitude?: number;

  @ApiProperty()
  address?: string;

  @ApiProperty()
  postal_code?: string;

  @ApiProperty()
  email?: string;

  @ApiProperty()
  education_level?: string;

  @ApiProperty()
  environment?: string;

  @ApiProperty()
  school_type?: string;

  @ApiProperty()
  country_id?: number;

  @ApiProperty()
  location_id?: number;

  @ApiProperty()
  admin_1_name?: string;

  @ApiProperty()
  admin_2_name?: string;

  @ApiProperty()
  admin_3_name?: string;

  @ApiProperty()
  admin_4_name?: string;

  @ApiProperty()
  external_id?: string;

  @ApiProperty()
  name_lower?: string;

  @ApiProperty()
  giga_id_school?: string;

  @ApiProperty()
  education_level_regional?: string;

  @ApiProperty()
  last_weekly_status_id?: number;

  @ApiProperty()
  feature_flags?: FeatureFlagDto;

  @ApiProperty()
  created_at?: Date;
}
