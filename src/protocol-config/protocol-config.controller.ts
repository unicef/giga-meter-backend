import {
  Controller,
  Get,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthGuard } from '../auth/auth.guard';
import { ApiSuccessResponseDto } from '../common/common.dto';
import { getRateLimitConfig } from '../config/rate-limit.config';
import { ProtocolConfigService } from './protocol-config.service';
import { ResolvedProtocolConfigDto } from './protocol-config.dto';
import { ProtocolConfigResolveQueryDto } from './protocol-config-resolve-query.dto';

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
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
    }),
  )
  async resolve(
    @Query() query: ProtocolConfigResolveQueryDto,
  ): Promise<ApiSuccessResponseDto<ResolvedProtocolConfigDto>> {
    const data = await this.protocolConfigService.resolve(
      query.gigaIdSchool,
      query.countryCode,
    );
    return {
      success: true,
      data: {
        measurementProvider: data.measurementProvider,
        betweenTestsDelaySec: data.betweenTestsDelaySec,
        configSource: data.configSource,
      },
      timestamp: new Date().toISOString(),
      message: '',
    };
  }
}
