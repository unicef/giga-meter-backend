import { ApiProperty } from '@nestjs/swagger';
import { GeoLocationDto } from '../measurement/measurement.dto';
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

  @ApiProperty({ required: false })
  device_hardware_id?: string;

  @ApiProperty({ required: false })
  is_active?: boolean;

  @ApiProperty({ required: false })
  windows_username?: string;

  @ApiProperty({ required: false })
  installed_path?: string;

  @ApiProperty({ required: false })
  wifi_connections?: any[];

  @ApiProperty({
    required: false,
    description:
      'UUID the app generates for this app instance (one install under one Windows user, for one registration). Registering again with the same one returns the same registration.',
  })
  app_instance_id?: string;

  @ApiProperty({
    required: false,
    enum: ['manual', 'auto'],
    description:
      'manual: the user picked the school. auto: the app took the school from the registration this PC already has.',
  })
  registration_source?: string;

  @ApiProperty({
    required: false,
    description: 'Motherboard serial. Stored, never returned.',
  })
  baseboard_serial?: string;

  @ApiProperty({
    required: false,
    description: 'Internal disk serial. Stored, never returned.',
  })
  disk_serial?: string;

  @ApiProperty({
    required: false,
    description:
      'Windows install ID (MachineGuid). Stored, never returned; used to match a PC only when none of the hardware values can be used.',
  })
  machine_guid?: string;

  @ApiProperty({
    required: false,
    description:
      'The physical PC this registration belongs to, given by the server.',
  })
  device_id?: string;
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

export class CreateSchoolResponseDto {
  @ApiProperty()
  user_id: string;

  @ApiProperty({
    required: false,
    nullable: true,
    description:
      'Device ID (TECH-8828) of this registration (app instance): the physical PC it is on. Null when it could not be worked out',
  })
  device_id?: string | null;
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

export class ClaimAppInstanceDto {
  @ApiProperty({
    description:
      "The registration's user_id: the schoolUserId the app already holds.",
  })
  user_id: string;

  @ApiProperty({
    description: 'The UUID this app instance generated for itself.',
  })
  app_instance_id: string;
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

  @ApiProperty({
    required: false,
    nullable: true,
    description:
      "Device ID (TECH-8828): the physical PC. The asking app instance's own registration's when app_instance_id is given and found, otherwise the latest matching registration's; absent when the device is not found",
  })
  device_id?: string | null;
}
