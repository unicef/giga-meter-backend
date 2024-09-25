import { ApiProperty } from '@nestjs/swagger';

export class MetricsDto {
  @ApiProperty()
  countries: number;

  @ApiProperty()
  schools: number;

  @ApiProperty()
  measurements: number;
}
