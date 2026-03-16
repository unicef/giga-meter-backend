import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GeocodeQueryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  address: string;

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
