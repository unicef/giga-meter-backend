import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsString } from 'class-validator';

export class GetRawPingsQueryDto {
  @ApiProperty({ description: 'School ID', required: true })
  @IsString()
  schoolId: string;

  @ApiProperty({
    description: 'Start date of the range',
    required: false,
    example: new Date(new Date().setHours(0, 0, 0, 0) - 1)
      .toISOString()
      .substring(0, 10),
  })
  @IsDateString()
  from?: string;

  @ApiProperty({
    description: 'End date of the range',
    required: false,
    //EXAMPLE OF CURRENT DATE.
    example: new Date(new Date().setHours(23, 59, 59, 999))
      .toISOString()
      .substring(0, 10),
  })
  @IsDateString()
  to?: string;

  @ApiProperty({ description: 'Page number', required: true, default: 1 })
  @Type(() => Number)
  @IsInt()
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    default: 100,
    minimum: 1,
  })
  @IsInt()
  @Type(() => Number)
  pageSize: number = 100;
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
}

export class GetRawPingsResponseDto {
  @ApiProperty({ type: MetaDto })
  meta: MetaDto;
  @ApiProperty({ type: [PingCheckDto] })
  data: PingCheckDto[];
}
