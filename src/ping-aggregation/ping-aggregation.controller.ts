import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Query,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  GetRawPingsQueryDto,
  GetRawPingsResponseDto,
} from './ping-aggregation.dto';
import { PingAggregationService } from './ping-aggregation.service';

@ApiTags('Ping Aggregation')
@Controller('api/v1/ping-aggregation')
export class PingAggregationController {
  private readonly logger = new Logger(PingAggregationController.name);
  constructor(
    private readonly pingAggregationService: PingAggregationService,
  ) {}

  @Get('sync')
  async aggregateDailyPingData(
    @Query('syncDate', {
      transform(value) {
        try {
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            return undefined;
          }
          return date;
        } catch (error) {
          return undefined;
        }
      },
    })
    syncDate?: Date | undefined,
  ) {
    try {
      await this.pingAggregationService.aggregateDailyPingData(syncDate);
      return { success: true };
    } catch (error) {
      this.logger.error(error);
      throw new HttpException(error, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('records')
  @ApiOperation({
    summary: 'Returns the raw ping data for a school',
  })
  @ApiOkResponse({
    description: 'Returns the raw ping data for a school',
    type: GetRawPingsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized; Invalid api key provided',
  })
  async getAggregateRecords(@Query() query: GetRawPingsQueryDto) {
    try {
      return this.pingAggregationService.getRawPings(query);
    } catch (error) {
      this.logger.error(error);
      throw new HttpException(error, HttpStatus.BAD_REQUEST);
    }
  }
}
