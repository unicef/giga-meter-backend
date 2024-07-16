import { ApiProperty } from '@nestjs/swagger';

export class ApiSuccessResponseDto<T> {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  timestamp: string;

  @ApiProperty()
  data: T;

  @ApiProperty()
  message: string = '';
}

export class ApiFailureResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  timestamp: string;

  @ApiProperty()
  message: string;
}

export class AddRecordResponseDto {
  @ApiProperty()
  user_id: string;
}
