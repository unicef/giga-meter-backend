import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export class WifiConnectionDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ssid?: string;

  @ApiProperty({ required: false, description: 'Signal strength in dBm' })
  @IsOptional()
  strength?: number;
}

/**
 * Generic device registration request.
 *
 * Exactly one of `giga_id_school` or `giga_id_health` must be provided.
 * The entity type is inferred automatically:
 *   - `giga_id_school` → entity_type "school"
 *   - `giga_id_health` → entity_type "health"
 */
export class CreateRegistrationDto {
  @ApiProperty({
    required: false,
    description:
      'Giga-assigned school UUID. Provide this to register a school device (mutually exclusive with giga_id_health).',
    example: '2abb47dd-3fca-44b1-b6c8-0ec0c863c236',
  })
  @ValidateIf((o) => !o.giga_id_health)
  @IsNotEmpty()
  @IsString()
  giga_id_school?: string;

  @ApiProperty({
    required: false,
    description:
      'Giga-assigned health facility UUID. Provide this to register a health device (mutually exclusive with giga_id_school).',
    example: 'hf-a1b2c3d4-5e6f-7890-abcd-ef1234567890',
  })
  @ValidateIf((o) => !o.giga_id_school)
  @IsNotEmpty()
  @IsString()
  giga_id_health?: string;

  @ApiProperty({ description: 'ISO-2 country code, e.g. KE', example: 'KE' })
  @IsNotEmpty()
  @IsString()
  country_code: string;

  @ApiProperty({ required: false, description: 'Platform installation ID' })
  @IsOptional()
  @IsString()
  installation_id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  user_id?: string;

  @ApiProperty({
    required: false,
    description: 'Operating system, e.g. Windows',
    example: 'Windows',
  })
  @IsOptional()
  @IsString()
  os?: string;

  @ApiProperty({
    required: false,
    description: 'App semantic version, e.g. 1.2.3',
    example: '1.2.3',
  })
  @IsOptional()
  @IsString()
  app_version?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  mac_address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  device_hardware_id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ip_address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  network_information?: string;

  @ApiProperty({
    required: false,
    description: 'Array of visible Wi-Fi access points',
    type: [WifiConnectionDto],
  })
  @IsOptional()
  @IsArray()
  wifi_connections?: WifiConnectionDto[];
}

export class RegistrationResponseDto {
  @ApiProperty({
    description: 'Giga-assigned facility UUID (giga_id_school or giga_id_health)',
    example: '2abb47dd-3fca-44b1-b6c8-0ec0c863c236',
  })
  giga_id: string;

  @ApiProperty({
    description: 'Assigned registration ID (serialised as string — BigInt in DB)',
    example: '987654',
    type: 'string',
  })
  registration_id: string;

  @ApiProperty({
    description: 'Resolved entity type name',
    enum: ['school', 'health'],
    example: 'school',
  })
  entity_type: string;
}
