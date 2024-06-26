import { ApiProperty } from '@nestjs/swagger';

export class MessagesDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  created_date: string;

  @ApiProperty()
  modified_date: string;

  @ApiProperty()
  firstname: string;

  @ApiProperty()
  lastname: string;

  @ApiProperty()
  school_id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  message: string;

  @ApiProperty()
  created_at: Date;
}
