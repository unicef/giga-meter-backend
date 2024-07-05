import { ApiProperty } from '@nestjs/swagger';

export class CountryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  code_iso3: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  country_id: string;

  @ApiProperty()
  created_at: Date;
}
