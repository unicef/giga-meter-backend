import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ProtocolConfigResolveQueryDto {
  @ApiPropertyOptional({ description: 'Giga school identifier' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  gigaIdSchool?: string;

  @ApiPropertyOptional({
    description: 'Country code matching country.code (e.g. ISO alpha-2)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  countryCode?: string;
}
