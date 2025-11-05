import { ApiProperty } from '@nestjs/swagger';
import { SchoolMasterDto } from '../school-master/school-master.dto';

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

  @ApiProperty({ required: false })
  device_hardware_id?: string;

  @ApiProperty({ required: false })
  is_active?: boolean;
}

export class CheckNotifyDto {
  @ApiProperty()
  notify: boolean;

  @ApiProperty()
  download_url: string;
}

export class CheckExistingInstallationDto {
  @ApiProperty()
  exists: boolean;

  @ApiProperty({ required: false })
  user_id?: string;

  @ApiProperty({ required: false })
  school_id?: string;

  @ApiProperty({ required: false })
  giga_id_school?: string;

  @ApiProperty({ required: false })
  mac_address?: string;

  @ApiProperty({ required: false })
  os?: string;

  @ApiProperty({ required: false })
  ip_address?: string;

  @ApiProperty({ required: false })
  app_version?: string;

  @ApiProperty({ required: false })
  country_code?: string;

  @ApiProperty({ required: false })
  source?: string; // 'dailycheckapp_school' or 'measurements'

  @ApiProperty({ required: false, type: SchoolMasterDto })
  schoolInfo?: SchoolMasterDto; // School record from the school table matched by giga_id_school

  @ApiProperty({ required: false })
  is_active?: boolean;
}

export class DeactivateDeviceDto {
  @ApiProperty()
  device_hardware_id: string;

  @ApiProperty()
  giga_id_school: string;
}

export class DeactivateDeviceResponseDto {
  @ApiProperty()
  deactivated: boolean;

  @ApiProperty({ required: false })
  message?: string;
}

export class CheckDeviceStatusDto {
  @ApiProperty({
    description:
      'Whether the device is active. Only false if explicitly deactivated. Returns true for backward compatibility if device not found or is_active is null/undefined.',
  })
  is_active: boolean;

  @ApiProperty({
    description:
      'Message indicating device status (e.g., "Device is active", "Device has been deactivated", "Device not found")',
  })
  message: string;

  @ApiProperty({
    description: 'Whether the device exists in the database',
  })
  exists: boolean;
}
