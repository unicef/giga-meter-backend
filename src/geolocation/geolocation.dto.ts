import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export class GeocodeQueryDto {
  @ApiProperty({ required: false })
  @ValidateIf((value) => value.latitude == null || value.longitude == null)
  @IsString()
  @IsNotEmpty()
  address?: string;

  @ApiProperty({ required: false })
  @ValidateIf((value) => !value.address)
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiProperty({ required: false })
  @ValidateIf((value) => !value.address)
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  components?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bounds?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  language?: string;
}
