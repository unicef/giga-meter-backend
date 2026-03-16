import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateSchoolRegistrationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  school_id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  school_name: string;

  @ApiProperty()
  @Type(() => Number)
  @Min(-90)
  @Max(90)
  @IsNumber()
  @IsNotEmpty()
  latitude: number;

  @ApiProperty()
  @Type(() => Number)
  @Min(-180)
  @Max(180)
  @IsNumber()
  @IsNotEmpty()
  longitude: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  address_line1: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address_line2?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  postal_code: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  contact_name: string;

  @ApiProperty()
  @IsEmail()
  contact_email: string;
}

export class SchoolRegistrationVerificationPayloadDto {
  registration_id: string;
  school_id: string;
  school_name: string;
  latitude: number;
  longitude: number;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  contact_name: string;
  contact_email: string;
  giga_id_school: string;
  created_at: string;
  modified_at: string;
}

export class SchoolRegistrationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  giga_id_school: string;

  @ApiProperty()
  verification_status: string;

  @ApiProperty()
  deleted: boolean;
}

export class RejectSchoolRegistrationDto {
  @ApiProperty()
  @IsUUID()
  giga_id_school: string;

  @ApiProperty()
  @IsBoolean()
  is_deleted: boolean;
}
