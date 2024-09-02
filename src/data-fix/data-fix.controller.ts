import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExcludeController,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';

@ApiExcludeController()
@ApiTags('DataFix')
@Controller('api/v1/dailycheckapp_data_fix')
export class DataFixController {
  constructor() {}

  @Get(':giga_id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Deprecated: Returns an empty list to support a deprecated endpoint',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the empty list',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized; Invalid api key provided',
  })
  async dataFix() {
    try {
      return {
        code: 200,
        success: true,
        timestamp: new Date().toISOString(),
        data: [],
      };
    } catch (error) {
      throw new HttpException('Failed  with ' + error, HttpStatus.BAD_REQUEST);
    }
  }
}
