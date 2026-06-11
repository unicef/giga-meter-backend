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
  RegistrationResponseDto,
} from './registration.dto';
import { RegistrationService } from './registration.service';

@ApiTags('Registration')
@Controller('api/v1/registration')
export class RegistrationController {
  constructor(private readonly registrationService: RegistrationService) {}

  /**
   * POST /api/v1/registration
   *
   * Generic device registration for school and health facility devices.
   * Provide exactly one of `giga_id_school` or `giga_id_health` to determine
   * the entity type — no `entity_type` field is required.
   *
   * Returns a `registration_id` the device must include in all subsequent
   * measurement submissions.
   *
   * Auth: Public (no token required).
   */
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
    summary: 'Register a device for a school or health facility',
    description:
      'Provide exactly one of `giga_id_school` (school device) or `giga_id_health` ' +
      '(health facility device). The entity type is inferred automatically. ' +
      'Returns a `registration_id` required on all subsequent measurement submissions.',
  })
  @ApiBody({ type: CreateRegistrationDto })
  @ApiResponse({
    status: 201,
    description: 'Registration created — returns giga_id, registration_id, and entity_type',
    type: RegistrationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Neither or both entity IDs provided; facility not found for provided ID' })
  @ApiResponse({ status: 403, description: 'Entity type not whitelisted for this country_code' })
  @ApiResponse({ status: 404, description: 'Facility not found or deleted' })
  async createRegistration(
    @Body() dto: CreateRegistrationDto,
  ): Promise<RegistrationResponseDto> {
    return this.registrationService.createRegistration(dto);
  }
}
