import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from 'src/utility/dto';

export class BaseCreateConnectivityDto {
  @ApiProperty({
    description: 'The timestamp of the connectivity check',
  })
  timestamp: Date;

  @ApiProperty({
    description: 'The connection status of the connectivity check',
  })
  is_connected: boolean;
  @ApiProperty({
    description: 'The error message of the connectivity check',
  })
  error_message: string;

  @ApiProperty({
    description: 'The giga id of the school',
  })
  giga_id_school: string;
}

export class CreateConnectivityDto extends BaseCreateConnectivityDto {}

export class GetConnectivityDto extends BaseCreateConnectivityDto {
  @ApiProperty({
    description: 'The id of the connectivity check',
  })
  id: number;

  @ApiProperty({
    description: 'The created at timestamp of the connectivity check',
  })
  created_at: Date;
}

export class GetConnectivityRecordsDto extends PaginationDto {
  @ApiProperty({
    description: 'The start time to filter the connectivity checks',
    required: false,
    example: new Date(0),
  })
  start_time?: Date;
  @ApiProperty({
    description: 'The end time to filter the connectivity checks',
    required: false,
    example: new Date(),
  })
  end_time?: Date;
}

export class GetConnectivityRecordsWithSchoolDto extends GetConnectivityRecordsDto {
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
