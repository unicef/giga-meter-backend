import { ApiProperty } from '@nestjs/swagger';
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

export { CreateRegistrationDto, RegistrationResponseDto };
