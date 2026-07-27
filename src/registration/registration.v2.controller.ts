import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../common/public.decorator';
import {
  CreateRegistrationDto,
  DeactivateRegistrationDto,
  ExistingRegistrationResponseDto,
  RegistrationStatusResponseDto,
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

  @Public()
  @Get('existing')
  @ApiOperation({
    summary: 'Resolve an existing registration from legacy/partial identifiers',
    description:
      'Resolution priority chain (first match wins): `installation_id` → ' +
      '`device_hardware_id` → `giga_id` (+ optional `browser_id`). Lets ' +
      'legacy installs (which never stored a registration_id) recover it on ' +
      'first launch after update.',
  })
  @ApiQuery({ name: 'installation_id', required: false, type: 'string' })
  @ApiQuery({ name: 'device_hardware_id', required: false, type: 'string' })
  @ApiQuery({ name: 'giga_id', required: false, type: 'string' })
  @ApiQuery({ name: 'browser_id', required: false, type: 'string' })
  @ApiResponse({ status: 200, type: ExistingRegistrationResponseDto })
  @ApiResponse({ status: 404, description: 'No registration matches' })
  async findExisting(
    @Query('installation_id') installation_id?: string,
    @Query('device_hardware_id') device_hardware_id?: string,
    @Query('giga_id') giga_id?: string,
    @Query('browser_id') browser_id?: string,
  ): Promise<ExistingRegistrationResponseDto> {
    return this.registrationService.findExisting({
      installation_id,
      device_hardware_id,
      giga_id,
      browser_id,
    });
  }

  @Public()
  @Get('status')
  @ApiOperation({
    summary: 'Device status by installation_id (facility-agnostic)',
  })
  @ApiQuery({ name: 'installation_id', required: true, type: 'string' })
  @ApiResponse({ status: 200, type: RegistrationStatusResponseDto })
  async getStatus(
    @Query('installation_id') installation_id: string,
  ): Promise<RegistrationStatusResponseDto> {
    return this.registrationService.getStatus(installation_id);
  }

  @Public()
  @Post('deactivate')
  @HttpCode(HttpStatus.OK)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  @ApiOperation({
    summary: 'Deactivate a registration (logout) for any facility type',
  })
  @ApiBody({ type: DeactivateRegistrationDto })
  @ApiResponse({ status: 200, description: 'Registration deactivated' })
  @ApiResponse({ status: 404, description: 'No registration matches' })
  async deactivate(
    @Body() dto: DeactivateRegistrationDto,
  ): Promise<{ success: true }> {
    return this.registrationService.deactivate(dto);
  }
}
