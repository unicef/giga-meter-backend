import {
  BadRequestException,
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
  GetRawPingConnectivityDto,
  GetRawPingsQueryDto,
  GetRawPingsResponseDto,
  PingRecordResponseDto,
  SyncQueryDto,
} from './ping-aggregation.dto';
import { PingAggregationService } from './ping-aggregation.service';
import { getDateFromString } from 'src/utility/utility';
import { ValidateSize } from 'src/common/validation.decorator';

@ApiTags('Ping Aggregation')
@Controller('api/v1/ping-aggregation')
export class PingAggregationController {
  private readonly logger = new Logger(PingAggregationController.name);
  constructor(
    private readonly pingAggregationService: PingAggregationService,
  ) {}

  @Get('sync')
  @ApiOperation({
    summary: 'Trigger daily ping data aggregation',
    description:
      'Manually triggers the aggregation of daily ping data. Can specify a date, otherwise defaults to the previous day.',
  })
  @ApiOkResponse({
    description: 'Daily ping data aggregation initiated successfully.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request. Invalid input or aggregation failed.',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error. An unexpected error occurred.',
  })
  async aggregateDailyPingData(@Query() query: SyncQueryDto) {
    try {
      const date = getDateFromString(query?.syncDate);
      await this.pingAggregationService.aggregateDailyPingData(date);
      return { success: true };
    } catch (error) {
      this.logger.error(error);
      throw new HttpException(error, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('records')
  @ApiOperation({
    summary: 'Returns the daily ping data for a school',
  })
  @ApiOkResponse({
    description: 'Returns the daily ping data for a school',
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

  @Get('raw-ping-records')
  @ApiOperation({
    summary: 'Returns the raw ping data for a school',
  })
  @ApiOkResponse({
    description: 'Returns the raw ping data for a school',
    type: PingRecordResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized; Invalid api key provided',
  })
  async getRawPingConnectivity(
    @Query() query: GetRawPingConnectivityDto,
    @ValidateSize({ min: 100, max: 10000 }) @Query('size') size: number,
  ) {
    try {
      return this.pingAggregationService.getRawPingConnectivity({
        ...query,
        size,
      });
    } catch (error) {
      this.logger.error(error);
      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
