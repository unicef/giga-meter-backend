import { ApiProperty } from '@nestjs/swagger';
import { GeoLocationDto } from '../measurement/measurement.dto';

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
  created_at: Date;
  
  @ApiProperty({
    description: 'Geolocation data from device',
    type: GeoLocationDto
  })
  geolocation?: GeoLocationDto;

  @ApiProperty({
    description: 'Distance between school location and detected location in meters'
  })
  detected_location_distance?: number;

  @ApiProperty({
    description: 'Accuracy of the geolocation in meters'
  })
  detected_location_accuracy?: number;

  @ApiProperty({
    description: 'Flag if distance > X & accuracy > Y'
  })
  detected_location_is_flagged?: boolean;
}

export class CheckNotifyDto {
  @ApiProperty()
  notify: boolean;

  @ApiProperty()
  download_url: string;
}
