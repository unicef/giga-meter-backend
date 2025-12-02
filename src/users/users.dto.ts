import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsString,
  IsEmail,
  IsBoolean,
  IsDate,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CommonResponseDto } from 'src/utility/dto';

export type UserRoleMap = Record<string, boolean>;

export class SignUserDataDto {
  @ApiProperty({ type: Object })
  userRole: UserRoleMap;

  @ApiProperty()
  @IsInt()
  id: number;

  @ApiProperty()
  @IsString()
  first_name: string;

  @ApiProperty()
  @IsString()
  last_name: string;

  @ApiProperty()
  @IsString()
  username: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  user_name: string;

  @ApiProperty({ type: Date })
  @IsDate()
  @Type(() => Date)
  last_login: Date;

  @ApiProperty()
  @IsBoolean()
  is_active: boolean;

  @ApiProperty()
  @IsBoolean()
  is_superuser: boolean;

  @ApiProperty({ type: Date })
  @IsDate()
  @Type(() => Date)
  created_at: Date;

  @ApiProperty({ type: Date })
  @IsDate()
  @Type(() => Date)
  updated_at: Date;
}

export class SignUserDtoResponse extends CommonResponseDto {
  @ApiProperty({ type: SignUserDataDto })
  @ValidateNested()
  @Type(() => SignUserDataDto)
  data: SignUserDataDto;
}
