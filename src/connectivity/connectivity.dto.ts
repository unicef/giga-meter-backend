import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from 'src/utility/dto';

export class ConnectivityDto {
  @ApiProperty({
    description: 'The id of the connectivity check',
  })
  id: number;

  @ApiProperty({
    description: 'The timestamp of the connectivity check',
  })
  timestamp: Date;

  @ApiProperty({
    description: 'The connection status of the connectivity check',
  })
  is_connected: boolean;

  @ApiProperty({
    description: 'The response time of the connectivity check',
  })
  response_time: bigint;

  @ApiProperty({
    description: 'The target host of the connectivity check',
  })
  target_host: string;

  @ApiProperty({
    description: 'The number of packets sent in the connectivity check',
  })
  packet_sent: bigint;

  @ApiProperty({
    description: 'The number of packets received in the connectivity check',
  })
  packet_received: bigint;

  @ApiProperty({
    description: 'The error message of the connectivity check',
  })
  error_message: string;

  @ApiProperty({
    description: 'The giga id of the school',
  })
  giga_id_school: string;
}

export class GetConnectivityRecordsDto extends PaginationDto {
  @ApiProperty({
    description: 'The giga id of the school to filter the connectivity checks',
    required: true,
  })
  giga_id_school: string;
}

export class GetConnectivityRecordDto {
  @ApiProperty({
    description: 'The id of the connectivity check',
    required: true,
  })
  id: number;
}
