import {
  Body,
  Controller,
  HttpCode,
  Post,
  Put,
  UseFilters,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponseDto } from '../common/common.dto';
import { Public } from '../common/public.decorator';
import {
  CreateSchoolRegistrationDto,
  RejectSchoolRegistrationDto,
  SchoolRegistrationResponseDto,
} from './school-registration.dto';
import { SchoolRegistrationExceptionFilter } from './school-registration.filter';
import { SchoolRegistrationService } from './school-registration.service';

@ApiTags('School Registrations')
@Controller('api/v1/school-registrations')
@UseFilters(SchoolRegistrationExceptionFilter)
export class SchoolRegistrationController {
  constructor(
    private readonly schoolRegistrationService: SchoolRegistrationService,
  ) {}

  @Public()
  @Post()
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  @ApiOperation({ summary: 'Create or refresh a school registration' })
  @ApiResponse({
    status: 201,
    description: 'School registration saved successfully',
    type: SchoolRegistrationResponseDto,
  })
  async createRegistration(
    @Body() registrationDto: CreateSchoolRegistrationDto,
  ): Promise<ApiSuccessResponseDto<SchoolRegistrationResponseDto>> {
    const registration =
      await this.schoolRegistrationService.createRegistration(registrationDto);

    return {
      success: true,
      data: registration,
      timestamp: new Date().toISOString(),
      message: 'success',
    };
  }

  @Put('rejection')
  @HttpCode(200)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Receive a school registration rejection callback' })
  @ApiResponse({
    status: 200,
    description: 'School registration rejection processed successfully',
    type: SchoolRegistrationResponseDto,
  })
  async rejectRegistration(
    @Body() rejectionDto: RejectSchoolRegistrationDto,
  ): Promise<ApiSuccessResponseDto<SchoolRegistrationResponseDto>> {
    const registration =
      await this.schoolRegistrationService.rejectRegistration(rejectionDto);

    return {
      success: true,
      data: registration,
      timestamp: new Date().toISOString(),
      message: 'success',
    };
  }
}
