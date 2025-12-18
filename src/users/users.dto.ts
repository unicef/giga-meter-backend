import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsString,
  IsEmail,
  IsBoolean,
  IsDate,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CommonResponseDto } from 'src/utility/dto';

export type UserRoleMap = Record<string, boolean>;

export class GetUsersQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  page_size = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  page = 1;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ordering = 'first_name,last_name';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search: string;
}

export class UserDto {
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

export class GetUsersDtoResponse extends CommonResponseDto {
  @ApiProperty({ type: [UserDto] })
  @ValidateNested({ each: true })
  @Type(() => UserDto)
  data: UserDto[];
}

export class GetUserDtoResponse extends CommonResponseDto {
  @ApiProperty({ type: UserDto })
  @ValidateNested()
  @Type(() => UserDto)
  data: UserDto;
}

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  first_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  last_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @Type(() => Number)
  roleId: number;
}

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
