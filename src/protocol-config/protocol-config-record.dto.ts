import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MEASUREMENT_PROVIDERS, MeasurementProvider } from './protocol-config.types';

export class CountryProtocolConfigRecordDto {
  @ApiProperty({ example: 'ES' })
  countryCode: string;

  @ApiProperty({ enum: MEASUREMENT_PROVIDERS, example: 'mlab' })
  measurementProvider: MeasurementProvider;

  @ApiProperty({ example: 0 })
  betweenTestsDelaySec: number;

  @ApiProperty({ example: '2026-05-12T12:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-05-12T12:00:00.000Z' })
  updatedAt: string;
}

export class SchoolProtocolConfigRecordDto {
  @ApiProperty({ example: '5ff8f4cc-9f74-3f48-8cb1-e68e063a7c05' })
  gigaIdSchool: string;

  @ApiPropertyOptional({
    enum: MEASUREMENT_PROVIDERS,
    nullable: true,
    example: 'cloudflare',
  })
  measurementProvider: MeasurementProvider | null;

  @ApiPropertyOptional({ example: 5, nullable: true })
  betweenTestsDelaySec: number | null;

  @ApiProperty({ example: '2026-05-12T12:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-05-12T12:00:00.000Z' })
  updatedAt: string;
}
