import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  MEASUREMENT_PROVIDERS,
  MeasurementProvider,
} from './protocol-config.types';

export class UpsertHealthProtocolConfigDto {
  @ApiPropertyOptional({
    isArray: true,
    enum: MEASUREMENT_PROVIDERS,
    description:
      'Empty array clears the override (health facility inherits from country / default).',
    example: ['cloudflare'],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(MEASUREMENT_PROVIDERS, { each: true })
  measurementProviders?: MeasurementProvider[];

  @ApiPropertyOptional({ example: 5, minimum: 0, nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value != null)
  @IsInt()
  @Min(0)
  betweenTestsDelaySec?: number | null;
}
