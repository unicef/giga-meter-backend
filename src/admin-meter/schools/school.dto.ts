import { ApiProperty } from '@nestjs/swagger';

export class DeactivateDeviceDto {
  @ApiProperty()
  device_hardware_id: string;

  @ApiProperty()
  giga_id_school: string;
}

export class toggleIsActiveDeviceDto extends DeactivateDeviceDto {
  @ApiProperty()
  is_active: boolean;
}

export class toggleIsActiveSchoolDto {
  @ApiProperty()
  giga_id_school: string;

  @ApiProperty()
  giga_ids_school?: string[] = [];

  @ApiProperty()
  is_active: boolean;

  @ApiProperty({ required: false, type: [String] })
  country_codes?: string[] = [];
}

export class FeatureFlagSchoolDto {
  @ApiProperty()
  giga_id_school: string;

  @ApiProperty({
    description: 'Key-value pairs for feature flags',
    example: { feature_name: true },
  })
  feature_flags: Record<string, boolean>;
}

export class FeatureFlagResponseDto {
  @ApiProperty({
    description: 'Key-value pairs for feature flags',
    example: { feature_name: true },
  })
  data: FeatureFlagSchoolDto;
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

export class RequestSchoolsAdminDto {
  //search
  @ApiProperty({ required: false })
  search?: string;

  @ApiProperty({ required: false })
  page?: number;

  @ApiProperty({ required: false })
  limit?: number;

  @ApiProperty({ required: false })
  giga_id_school?: string;

  @ApiProperty({ required: false, type: [String] })
  countries?: string[];

  @ApiProperty({ required: false })
  status?: boolean = null as any;
}
