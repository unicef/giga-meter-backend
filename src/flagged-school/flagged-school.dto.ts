import { ApiProperty } from '@nestjs/swagger';

export class FlaggedSchoolDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  detected_country: string;

  @ApiProperty()
  selected_country: string;

  @ApiProperty()
  school_id: string;

  @ApiProperty()
  created: string;

  @ApiProperty()
  giga_id_school: string;

  @ApiProperty()
  created_at: Date;
}
