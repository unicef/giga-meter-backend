import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../common/public.decorator';
import {
  CreateRegistrationDto,
  RegistrationV2ResponseDto,
} from './registration.v2.dto';
import { RegistrationService } from './registration.service';

@ApiTags('Registration V2')
@Controller('api/v2/registration')
export class RegistrationV2Controller {
  constructor(private readonly registrationService: RegistrationService) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  @ApiOperation({
    summary: 'Register a device for a school or health facility (V2)',
    description:
      'Provide exactly one of `giga_id_school` or `giga_id_health`. ' +
      'The facility type is inferred automatically. Returns `facility_type` in the response.',
  })
  @ApiBody({ type: CreateRegistrationDto })
  @ApiResponse({
    status: 201,
    description: 'Registration created — returns giga_id, registration_id, and facility_type',
    type: RegistrationV2ResponseDto,
  })
  async createRegistration(
    @Body() dto: CreateRegistrationDto,
  ): Promise<RegistrationV2ResponseDto> {
    return this.registrationService.createRegistration(dto);
  }
}
