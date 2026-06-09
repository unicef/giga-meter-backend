import {
  BadRequestException,
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiExcludeController,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import {
  CountriesListingDto,
  CountryFieldToggleDto,
  CountryToggleStatusDtoResponse,
} from './countries.dto';
import { CountriesService } from './countries.service';
import { Roles } from '../roles/roles.decorator';
import { PERMISSION_SLUGS } from '../roles/roles.constants';
import { AdminAccess } from 'src/common/admin.decorator';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';

@ApiExcludeController()
@UseGuards(AdminAuthGuard)
@Controller('api/v1/admin-meter-country')
@AdminAccess()
export class CountriesController {
  private logger = new Logger(CountriesController.name);
  constructor(private readonly countriesService: CountriesService) {}

  @Post()
  @Roles(PERMISSION_SLUGS.CAN_VIEW_COUNTRY)
  @ApiOperation({
    summary:
      'Returns the list of registered countries on the Giga Meter database',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the list of countries',
    type: Object,
    isArray: true,
  })
  async getAllCountries(
    @Body() queryParams: CountriesListingDto,
  ): Promise<any> {
    try {
      return this.countriesService.getAllCountries(queryParams);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @Put('toggle-country-flags')
  @Roles(PERMISSION_SLUGS.CAN_UPDATE_COUNTRY)
  @ApiOperation({
    summary: 'Update country by ids',
  })
  @ApiResponse({
    status: 200,
    description: 'Update country by id',
    type: Object,
  })
  async toggleCountryFlags(
    @Body() body: CountryFieldToggleDto,
  ): Promise<CountryToggleStatusDtoResponse> {
    try {
      return this.countriesService.toggleCountryFlags(body);
    } catch (error) {
      this.logger.error(error);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      )
        throw error;
      else {
        throw new InternalServerErrorException('Something went wrong');
      }
    }
  }
}
