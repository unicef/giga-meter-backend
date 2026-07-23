import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Put,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthGuard } from '../auth/auth.guard';
import { ApiSuccessResponseDto } from '../common/common.dto';
import { getRateLimitConfig } from '../config/rate-limit.config';
import { ProtocolConfigService } from './protocol-config.service';
import { ResolvedProtocolConfigDto } from './protocol-config.dto';
import {
  CountryProtocolConfigRecordDto,
  HealthProtocolConfigRecordDto,
  SchoolProtocolConfigRecordDto,
} from './protocol-config-record.dto';
import { ProtocolConfigResolveQueryDto } from './protocol-config-resolve-query.dto';
import { UpsertCountryProtocolConfigDto } from './protocol-config-upsert-country.dto';
import { UpsertSchoolProtocolConfigDto } from './protocol-config-upsert-school.dto';
import { UpsertHealthProtocolConfigDto } from './protocol-config-upsert-health.dto';

const validationPipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: false,
});

@ApiTags('ProtocolConfig')
@Controller('api/v1/protocol-config')
@UseGuards(ThrottlerGuard)
export class ProtocolConfigController {
  constructor(private readonly protocolConfigService: ProtocolConfigService) {}

  @Get('resolve')
  @Throttle(getRateLimitConfig('countries'))
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Resolve measurement protocol configuration (school overrides country overrides default)',
  })
  @ApiResponse({
    status: 200,
    description: 'Resolved protocol configuration',
    type: ResolvedProtocolConfigDto,
  })
  @UsePipes(validationPipe)
  async resolve(
    @Query() query: ProtocolConfigResolveQueryDto,
  ): Promise<ApiSuccessResponseDto<ResolvedProtocolConfigDto>> {
    const data = await this.protocolConfigService.resolve(
      query.gigaIdSchool,
      query.countryCode,
      query.gigaIdHealth,
    );
    return {
      success: true,
      data: {
        measurementProviders: data.measurementProviders,
        betweenTestsDelaySec: data.betweenTestsDelaySec,
        configSource: data.configSource,
      },
      timestamp: new Date().toISOString(),
      message: '',
    };
  }

  @Put('country/:countryCode')
  @Throttle(getRateLimitConfig('countries'))
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create or update country protocol configuration' })
  @ApiParam({
    name: 'countryCode',
    description: 'Country code matching country.code',
    required: true,
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Persisted country protocol configuration',
    type: CountryProtocolConfigRecordDto,
  })
  @UsePipes(validationPipe)
  async upsertCountry(
    @Param('countryCode') countryCode: string,
    @Body() body: UpsertCountryProtocolConfigDto,
  ): Promise<ApiSuccessResponseDto<CountryProtocolConfigRecordDto>> {
    const data = await this.protocolConfigService.upsertCountry(
      countryCode,
      body,
    );
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
      message: '',
    };
  }

  @Delete('country/:countryCode')
  @HttpCode(200)
  @Throttle(getRateLimitConfig('countries'))
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete country protocol configuration' })
  @ApiParam({
    name: 'countryCode',
    description: 'Country code matching country.code',
    required: true,
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Country protocol configuration deleted',
  })
  async deleteCountry(
    @Param('countryCode') countryCode: string,
  ): Promise<ApiSuccessResponseDto<null>> {
    await this.protocolConfigService.deleteCountry(countryCode);
    return {
      success: true,
      data: null,
      timestamp: new Date().toISOString(),
      message: '',
    };
  }

  @Put('school/:gigaIdSchool')
  @Throttle(getRateLimitConfig('countries'))
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create or update school protocol configuration' })
  @ApiParam({
    name: 'gigaIdSchool',
    description: 'Giga school identifier',
    required: true,
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Persisted school protocol configuration',
    type: SchoolProtocolConfigRecordDto,
  })
  @UsePipes(validationPipe)
  async upsertSchool(
    @Param('gigaIdSchool') gigaIdSchool: string,
    @Body() body: UpsertSchoolProtocolConfigDto,
  ): Promise<ApiSuccessResponseDto<SchoolProtocolConfigRecordDto>> {
    const data = await this.protocolConfigService.upsertSchool(
      gigaIdSchool,
      body,
    );
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
      message: '',
    };
  }

  @Delete('school/:gigaIdSchool')
  @HttpCode(200)
  @Throttle(getRateLimitConfig('countries'))
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete school protocol configuration' })
  @ApiParam({
    name: 'gigaIdSchool',
    description: 'Giga school identifier',
    required: true,
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'School protocol configuration deleted',
  })
  async deleteSchool(
    @Param('gigaIdSchool') gigaIdSchool: string,
  ): Promise<ApiSuccessResponseDto<null>> {
    await this.protocolConfigService.deleteSchool(gigaIdSchool);
    return {
      success: true,
      data: null,
      timestamp: new Date().toISOString(),
      message: '',
    };
  }

  @Put('health/:gigaIdHealth')
  @Throttle(getRateLimitConfig('countries'))
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create or update health facility protocol configuration',
  })
  @ApiParam({
    name: 'gigaIdHealth',
    description: 'Giga health facility identifier',
    required: true,
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Persisted health facility protocol configuration',
    type: HealthProtocolConfigRecordDto,
  })
  @UsePipes(validationPipe)
  async upsertHealth(
    @Param('gigaIdHealth') gigaIdHealth: string,
    @Body() body: UpsertHealthProtocolConfigDto,
  ): Promise<ApiSuccessResponseDto<HealthProtocolConfigRecordDto>> {
    const data = await this.protocolConfigService.upsertHealth(
      gigaIdHealth,
      body,
    );
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
      message: '',
    };
  }

  @Delete('health/:gigaIdHealth')
  @HttpCode(200)
  @Throttle(getRateLimitConfig('countries'))
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete health facility protocol configuration' })
  @ApiParam({
    name: 'gigaIdHealth',
    description: 'Giga health facility identifier',
    required: true,
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Health facility protocol configuration deleted',
  })
  async deleteHealth(
    @Param('gigaIdHealth') gigaIdHealth: string,
  ): Promise<ApiSuccessResponseDto<null>> {
    await this.protocolConfigService.deleteHealth(gigaIdHealth);
    return {
      success: true,
      data: null,
      timestamp: new Date().toISOString(),
      message: '',
    };
  }
}
