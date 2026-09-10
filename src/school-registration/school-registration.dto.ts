import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IS_OPTIONAL,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsObject,
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
  @IsString()
  @IsNotEmpty()
  country_iso3_code: string;

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
  @IsObject()
  @IsNotEmpty()
  address: Record<string, any>;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  education_level: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  contact_name: string;

  @ApiProperty()
  @IsOptional()
  contact_email: string;
}

export class SchoolRegistrationVerificationPayloadDto {
  registration_id: string;
  school_id: string;
  school_name: string;
  country_iso3_code: string;
  latitude: number;
  longitude: number;
  address: Record<string, any>;
  education_level: string;
  contact_name: string;
  contact_email: string;
  giga_id_school: string;
  created_at: string;
  modified_at: string;
}

export class SchoolRegistrationResponseDto {
  @ApiProperty()
  giga_id_school: string;

  @ApiProperty()
  verification_status: string;
}

export class RejectSchoolRegistrationDto {
  @ApiProperty()
  @IsUUID()
  giga_id_school: string;

  @ApiProperty()
  @IsBoolean()
  is_deleted: boolean;
}
