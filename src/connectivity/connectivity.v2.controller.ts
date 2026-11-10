import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import { ConnectivityService } from './connectivity.service';
import {
  ConnectivityV2ResponseDto,
  CreateConnectivityV2Dto,
} from './connectivity.v2.dto';

@UseGuards(AuthGuard)
@ApiBearerAuth()
@ApiTags('Connectivity Checks V2')
@Controller('api/v2/connectivity')
export class ConnectivityV2Controller {
  constructor(private readonly connectivityService: ConnectivityService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @ApiOperation({
    summary:
      'Create connectivity checks (V2) — identifier in the body ' +
      '(registration_id + facility_type), not the path',
  })
  @ApiBody({ type: CreateConnectivityV2Dto })
  @ApiResponse({ status: 201, type: ConnectivityV2ResponseDto })
  async createMany(
    @Body() dto: CreateConnectivityV2Dto,
  ): Promise<ConnectivityV2ResponseDto> {
    return this.connectivityService.createManyV2(dto);
  }
}
