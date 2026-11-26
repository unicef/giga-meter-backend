import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthGuard } from '../auth/auth.guard';
import { ApiSuccessResponseDto } from '../common/common.dto';
import { getRateLimitConfig } from '../config/rate-limit.config';
import { LocateTokenDto } from './mlab.dto';
import { MlabTokenService } from './mlab-token.service';

@ApiTags('M-Lab')
@Controller('api/v1/mlab')
@UseGuards(ThrottlerGuard)
export class MlabController {
  constructor(private readonly mlabTokenService: MlabTokenService) {}

  @Get('locate-token')
  @Throttle(getRateLimitConfig('mlab'))
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Token for M-Lab's priority server lookup, asked for by the Giga Meter app right before each speed test",
  })
  @ApiQuery({
    name: 'giga_id_school',
    required: false,
    description:
      'The school the test is for. Not used yet; sent so the lookup can be turned on for some schools first.',
  })
  @ApiResponse({
    status: 200,
    description:
      'The token, or nulls when the app should use the public lookup',
    type: LocateTokenDto,
  })
  async getLocateToken(): Promise<ApiSuccessResponseDto<LocateTokenDto>> {
    return {
      success: true,
      data: await this.mlabTokenService.getLocateToken(),
      timestamp: new Date().toISOString(),
      message: '',
    };
  }
}
