import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';
import { ApiSuccessResponseDto } from '../common/common.dto';
import { MetricsDto } from './metrics.dto';

@ApiTags('Metrics')
@Controller('api/v1/metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('')
  @ApiOperation({
    summary: 'Returns the metrics from the Daily Check App database',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns metrics object',
    type: MetricsDto,
    isArray: false,
  })
  async getMetrics(): Promise<ApiSuccessResponseDto<MetricsDto>> {
    const metrics = await this.metricsService.get();

    return {
      success: true,
      data: metrics,
      timestamp: new Date().toISOString(),
      message: 'success',
    };
  }
}
