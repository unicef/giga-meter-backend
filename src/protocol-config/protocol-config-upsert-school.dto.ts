import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, Min, ValidateIf } from 'class-validator';
import { MEASUREMENT_PROVIDERS, MeasurementProvider } from './protocol-config.types';

export class UpsertSchoolProtocolConfigDto {
  @ApiPropertyOptional({
    enum: MEASUREMENT_PROVIDERS,
    nullable: true,
    example: 'cloudflare',
  })
  @IsOptional()
  @ValidateIf((_, value) => value != null)
  @IsIn(MEASUREMENT_PROVIDERS)
  measurementProvider?: MeasurementProvider | null;

  @ApiPropertyOptional({ example: 5, minimum: 0, nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value != null)
  @IsInt()
  @Min(0)
  betweenTestsDelaySec?: number | null;
}
