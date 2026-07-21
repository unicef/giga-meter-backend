import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  Min,
} from 'class-validator';
import {
  MEASUREMENT_PROVIDERS,
  MeasurementProvider,
} from './protocol-config.types';

export class UpsertCountryProtocolConfigDto {
  @ApiProperty({
    isArray: true,
    enum: MEASUREMENT_PROVIDERS,
    example: ['mlab'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsIn(MEASUREMENT_PROVIDERS, { each: true })
  measurementProviders: MeasurementProvider[];

  @ApiProperty({ example: 0, minimum: 0 })
  @IsInt()
  @Min(0)
  betweenTestsDelaySec: number;
}
