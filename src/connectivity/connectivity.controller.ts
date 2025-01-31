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
import {
  CreateConnectivityDto,
  GetConnectivityRecordsWithSchoolDto,
} from './connectivity.dto';
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
  async create(
    @Body() createConnectivityDto: CreateConnectivityDto,
  ): Promise<CreateConnectivityDto> {
    return this.connectivityService.create(createConnectivityDto);
  }

  @Get()
  @DynamicResponse({ summary: 'Get all connectivity checks' })
  findAll(@Query() query: GetConnectivityRecordsWithSchoolDto) {
    return this.connectivityService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a connectivity check by id' })
  @IdParam('Connectivity Check')
  findOne(@Param('id') id: string) {
    return this.connectivityService.findOne(+id);
  }
}
