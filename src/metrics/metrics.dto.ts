import { ApiProperty } from '@nestjs/swagger';

export class MetricsDto {
  @ApiProperty()
  countries: number;

  @ApiProperty()
  schools: number;

  @ApiProperty({
    description:
      'Number of distinct health facilities registered on Giga Meter',
  })
  health_facilities: number;

  @ApiProperty()
  measurements: number;
}
