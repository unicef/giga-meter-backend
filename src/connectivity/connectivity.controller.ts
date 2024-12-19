import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ConnectivityService } from './connectivity.service';
import { ConnectivityDto, GetConnectivityRecordsDto } from './connectivity.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import { DynamicResponse, IdParam } from 'src/utility/decorators';

@UseGuards(AuthGuard)
@ApiBearerAuth()
@ApiTags('Connectivity Checks')
@Controller('connectivity')
export class ConnectivityController {
  constructor(private readonly connectivityService: ConnectivityService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new connectivity check' })
  async create(@Body() createConnectivityDto: ConnectivityDto) {
    return this.connectivityService.create(createConnectivityDto);
  }

  @Get()
  @DynamicResponse({ summary: 'Get all connectivity checks' })
  findAll(@Query() query: GetConnectivityRecordsDto) {
    const { giga_id_school } = query;
    return this.connectivityService.findAll(giga_id_school);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a connectivity check by id' })
  @IdParam('Connectivity Check')
  findOne(@Param('id') id: string) {
    return this.connectivityService.findOne(+id);
  }
}
