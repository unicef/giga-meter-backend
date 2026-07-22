import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class ConnectivityRecordV2Dto {
  @ApiProperty({ description: 'The timestamp of the connectivity check' })
  timestamp: Date;

  @ApiProperty({ description: 'The connection status of the connectivity check' })
  @IsBoolean()
  isConnected: boolean;

  @ApiProperty({ required: false, description: 'Error message, if any' })
  @IsOptional()
  @IsString()
  errorMessage?: string;

  @ApiProperty({ description: 'Client-generated UUID of the check (dedupe key)' })
  @IsString()
  app_local_uuid: string;

  @ApiProperty({ required: false, description: 'Latency in ms' })
  @IsOptional()
  latency?: number;
}

/**
 * POST /api/v2/connectivity — the identifier moved from the path (v1
 * `connectivity/{giga_id_school}`) into the body, keyed on
 * registration_id + facility_type. No client browserId is sent in v2.
 */
export class CreateConnectivityV2Dto {
  @ApiProperty({
    required: false,
    description: 'Registration ID returned by POST /api/v2/registration',
    type: 'string',
  })
  @IsOptional()
  registration_id?: string | number;

  @ApiProperty({ enum: ['school', 'health'] })
  @IsIn(['school', 'health'])
  facility_type: 'school' | 'health';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  giga_id_school?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  giga_id_health?: string;

  @ApiProperty({ required: false, description: 'Platform installation ID' })
  @IsOptional()
  @IsString()
  installation_id?: string;

  @ApiProperty({ type: [ConnectivityRecordV2Dto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConnectivityRecordV2Dto)
  records: ConnectivityRecordV2Dto[];
}

export class ConnectivityV2ResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty({ description: 'Number of records stored (duplicates skipped)' })
  accepted: number;
}
