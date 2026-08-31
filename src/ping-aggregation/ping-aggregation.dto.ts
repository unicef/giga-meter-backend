import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsString } from 'class-validator';

export class GetRawPingsQueryDto {
  @ApiProperty({
    description:
      'The GIGA ID of a school, eg: hfi3h5e5-2cc0-365c-8424-db9d0b6d02af',
    required: false,
  })
  @IsString()
  giga_id_school: string;

  @ApiProperty({
    description: 'Start date of the range',
    required: true,
    example: new Date(new Date().setHours(0, 0, 0, 0) - 1)
      .toISOString()
      .substring(0, 10),
  })
  @IsDateString()
  from: string;

  @ApiProperty({
    description: 'End date of the range',
    required: true,
    //EXAMPLE OF CURRENT DATE.
    example: new Date(new Date().setHours(23, 59, 59, 999))
      .toISOString()
      .substring(0, 10),
  })
  @IsDateString()
  to: string;

  @ApiProperty({ description: 'Page number', required: false, default: 1 })
  @Type(() => Number)
  @IsInt()
  page?: number = 1;

  @ApiProperty({
    required: false,
    description: 'Number of items per page',
    default: 100,
    minimum: 1,
  })
  @IsInt()
  @Type(() => Number)
  pageSize?: number = 100;
}

export class SyncQueryDto {
  @ApiPropertyOptional({
    description:
      'The specific date to run aggregation for. If not provided, it runs for the previous day.',
    type: String,
    format: 'date',
    example: new Date(new Date().setHours(0, 0, 0, 0) - 1)
      .toISOString()
      .substring(0, 10),
  })
  syncDate?: string;
}

class PingCheckDto {
  @ApiProperty()
  id: bigint;
  @ApiProperty()
  timestamp: Date;
  @ApiProperty()
  giga_id_school: string;
  @ApiProperty()
  device_id: string;
  @ApiProperty()
  is_connected: boolean;
  @ApiProperty()
  latency: number;
}

class MetaDto {
  @ApiProperty()
  page: number;
  @ApiProperty()
  pageSize: number;
  @ApiProperty()
  total: number;
  @ApiPropertyOptional()
  aggregationSchedulerStatus?: string;
  @ApiPropertyOptional()
  aggregationSchedulerLastRunTime?: string;
}

export class GetRawPingsResponseDto {
  @ApiProperty({ type: MetaDto })
  meta: MetaDto;
  @ApiProperty({ type: [PingCheckDto] })
  data: PingCheckDto[];
}

export class GetRawPingConnectivityDto {
  @ApiProperty({
    description:
      'The GIGA ID of a school, eg: hfi3h5e5-2cc0-365c-8424-db9d0b6d02af',
    required: false,
  })
  @IsString()
  giga_id_school: string;

  @ApiProperty({
    description: 'Start date of the range',
    required: true,
    example: new Date(new Date().setHours(0, 0, 0, 0) - 1)
      .toISOString()
      .substring(0, 10),
  })
  @IsDateString()
  from: string;

  @ApiProperty({
    description: 'End date of the range',
    required: true,
    //EXAMPLE OF CURRENT DATE.
    example: new Date(new Date().setHours(23, 59, 59, 999))
      .toISOString()
      .substring(0, 10),
  })
  @IsDateString()
  to: string;

  @ApiProperty({
    description: 'record size number',
    required: true,
    default: 100,
    minimum: 100,
    maximum: 10000,
  })
  @IsInt()
  @Type(() => Number)
  size: number = 100;

  @ApiProperty({
    description: 'record size number',
    required: true,
    default: 1,
    minimum: 1,
    maximum: 10000,
  })
  @IsInt()
  @Type(() => Number)
  page: number = 1;
}

export class GetRawPingConnectivityResponseDto {
  @ApiProperty({ type: MetaDto })
  meta: MetaDto;
  @ApiProperty({ type: [PingCheckDto] })
  data: PingCheckDto[];
}

export class PingRecordDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  timestamp: string;

  @ApiProperty({
    example: false,
  })
  isConnected: boolean;

  @ApiProperty()
  errorMessage: string | null;

  @ApiProperty()
  giga_id_school: string;

  @ApiProperty()
  app_local_uuid: string;

  @ApiProperty({ example: 'device-020' })
  deviceId?: string;

  @ApiProperty({ example: 'device-020' })
  browserId?: string;

  @ApiProperty()
  latency: number | null;

  @ApiProperty()
  created_at: string;
}

export class PingRecordResponseDto {
  @ApiProperty({ type: [PingRecordDto] })
  data: PingRecordDto[];
}
