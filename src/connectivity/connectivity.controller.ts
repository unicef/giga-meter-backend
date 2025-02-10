import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ConnectivityService } from './connectivity.service';
import {
  CreateConnectivityDto,
  CreateManyConnectivityDto,
  GetConnectivityRecordsWithSchoolDto,
} from './connectivity.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import { DynamicResponse, IdParam } from 'src/utility/decorators';

@UseGuards(AuthGuard)
@ApiBearerAuth()
@ApiTags('Connectivity Checks')
@Controller('api/v1/connectivity')
export class ConnectivityController {
  constructor(private readonly connectivityService: ConnectivityService) {}
  @Post(':giga_id_school')
  @ApiOperation({ summary: 'Create multiple connectivity checks' })
  async createMany(
    @Body() createManyConnectivityDto: CreateManyConnectivityDto,
    @Param('giga_id_school') giga_id_school: string,
  ): Promise<CreateConnectivityDto[]> {
    try {
      return this.connectivityService.createMany(
        createManyConnectivityDto.records,
        giga_id_school,
      );
    } catch (error) {
      throw new BadRequestException(error);
    }
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
