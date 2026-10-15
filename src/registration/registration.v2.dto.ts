import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CreateRegistrationDto, RegistrationResponseDto } from './registration.dto';

export class RegistrationV2ResponseDto {
  @ApiProperty({
    description: 'Giga-assigned facility UUID (giga_id_school or giga_id_health)',
    example: '2abb47dd-3fca-44b1-b6c8-0ec0c863c236',
  })
  giga_id: string;

  @ApiProperty({
    description: 'Assigned registration ID (serialised as string — BigInt in DB)',
    example: '987654',
    type: 'string',
  })
  registration_id: string;

  @ApiProperty({
    description: 'Resolved facility type name',
    enum: ['school', 'health'],
    example: 'school',
  })
  facility_type: 'school' | 'health';
}

export class ExistingRegistrationResponseDto {
  @ApiProperty({
    description: 'Registration ID (serialised as string — BigInt in DB)',
    example: '987654',
    type: 'string',
  })
  registration_id: string;

  @ApiProperty({
    description: 'Facility type of the registration',
    enum: ['school', 'health'],
    example: 'school',
  })
  facility_type: string;

  @ApiProperty({
    description: 'Giga-assigned facility UUID (giga_id_school or giga_id_health)',
    example: '2abb47dd-3fca-44b1-b6c8-0ec0c863c236',
    nullable: true,
  })
  giga_id: string | null;

  @ApiProperty({ nullable: true })
  is_active: boolean | null;

  @ApiProperty()
  is_blocked: boolean;
}

export class RegistrationStatusResponseDto {
  @ApiProperty({
    description: 'Whether a registration exists for the installation_id',
  })
  exists: boolean;

  @ApiProperty({ nullable: true })
  is_active: boolean | null;

  @ApiProperty({ nullable: true })
  is_blocked: boolean | null;
}

export class DeactivateRegistrationDto {
  @ApiProperty({ required: false, description: 'Platform installation ID' })
  @IsOptional()
  @IsString()
  installation_id?: string;

  @ApiProperty({
    required: false,
    description: 'Registration ID (string or number)',
    type: 'string',
  })
  @IsOptional()
  @IsString()
  registration_id?: string;
}

export { CreateRegistrationDto, RegistrationResponseDto };
