import { ApiProperty } from '@nestjs/swagger';

export class FeatureFlagDto {
  @ApiProperty()
  feature_flag?: boolean;

  @ApiProperty()
  feature_flag_2?: boolean;

  @ApiProperty()
  pingService?: boolean;
}

export class SchoolMasterDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  school_id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  country_id?: number;

  @ApiProperty()
  country: string;

  @ApiProperty()
  location_id?: number;

  @ApiProperty()
  address?: string;

  @ApiProperty()
  email?: string;

  @ApiProperty()
  postal_code?: string;

  @ApiProperty()
  education_level?: string;

  @ApiProperty()
  environment?: string;

  @ApiProperty()
  admin_1_name?: string;

  @ApiProperty()
  admin_2_name?: string;

  @ApiProperty()
  admin_3_name?: string;

  @ApiProperty()
  admin_4_name?: string;

  @ApiProperty()
  giga_id_school?: string;
}
