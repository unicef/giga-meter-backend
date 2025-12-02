import { ApiProperty } from '@nestjs/swagger';

export class PaginationDto {
  @ApiProperty({
    description: 'The page number to retrieve',
    example: 1,
    required: false,
  })
  page?: number;

  @ApiProperty({
    description: 'The number of items per page',
    example: 10,
    required: false,
  })
  per_page?: number;
}

export class CommonResponseDto {
  @ApiProperty({
    description: 'Status of the response',
    example: 'success',
  })
  status: number;

  @ApiProperty({
    description: 'Message of the response',
    example: 'Data retrieved successfully',
  })
  message: string;
}
