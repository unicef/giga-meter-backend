import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsString, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { SpeedTestProtocol } from '@prisma/client';
import { CommonResponseDto } from 'src/utility/dto';

export class CountriesListingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  limit = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  page = 1;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  country_id = 0;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(SpeedTestProtocol)
  speed_test_protocol?: SpeedTestProtocol;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Object)
  is_active?: boolean | null;
}

export class CountryFieldToggleDto {
  @ApiProperty()
  @IsInt()
  @Type(() => Array<number>)
  ids: number[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(SpeedTestProtocol)
  speed_test_protocol?: SpeedTestProtocol;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  is_active?: boolean;
}

export class CountryToggleStatusDtoResponse extends CommonResponseDto {
  @ApiProperty({ type: Object })
  @Type(() => Object)
  data: any;
}
