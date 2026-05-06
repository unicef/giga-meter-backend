import { ApiProperty } from '@nestjs/swagger';
import { MEASUREMENT_PROVIDERS } from './protocol-config.types';

export class ResolvedProtocolConfigDto {
  @ApiProperty({
    enum: MEASUREMENT_PROVIDERS,
    example: 'mlab',
  })
  measurementProvider: string;

  @ApiProperty({ example: 0 })
  betweenTestsDelaySec: number;

  @ApiProperty({
    enum: ['school', 'country', 'default'],
    example: 'default',
  })
  configSource: string;
}
