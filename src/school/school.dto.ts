import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsString } from 'class-validator';

export class SchoolDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  user_id: string;

  @ApiProperty()
  giga_id_school: string;

  @ApiProperty()
  mac_address: string;

  @ApiProperty()
  os: string;

  @ApiProperty()
  app_version: string;

  @ApiProperty()
  created: string;

  @ApiProperty()
  network_information: string;

  @ApiProperty()
  ip_address: string;

  @ApiProperty()
  country_code: string;

  @ApiProperty()
  is_blocked: boolean;

  @ApiProperty()
  email: string[];

  @ApiProperty()
  created_at: Date;
}

export class CheckNotifyDto {
  @ApiProperty()
  notify: boolean;

  @ApiProperty()
  download_url: string;
}

export class SchoolEmailUpdateDto {
  @ApiProperty()
  @IsString()
  mac_address: string;

  @ApiProperty({ type: [String], maxItems: 3 })
  @IsArray()
  @ArrayMaxSize(3)
  email: string[];

  @ApiProperty()
  @IsString()
  user_id: string;
}
