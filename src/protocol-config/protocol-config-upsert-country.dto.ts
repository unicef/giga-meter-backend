import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, Min } from 'class-validator';
import { MEASUREMENT_PROVIDERS, MeasurementProvider } from './protocol-config.types';

export class UpsertCountryProtocolConfigDto {
  @ApiProperty({
    enum: MEASUREMENT_PROVIDERS,
    example: 'mlab',
  })
  @IsIn(MEASUREMENT_PROVIDERS)
  measurementProvider: MeasurementProvider;

  @ApiProperty({ example: 0, minimum: 0 })
  @IsInt()
  @Min(0)
  betweenTestsDelaySec: number;
}
