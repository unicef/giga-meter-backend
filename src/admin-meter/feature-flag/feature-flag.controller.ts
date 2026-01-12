import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  Param,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FeatureFlagService } from './feature-flag.service';
import {
  CreateFeatureFlagDto,
  FeatureFlagListingDto,
  UpdateFeatureFlagDto,
} from './feature-flag.dto';
import { Roles } from '../roles/roles.decorator';
import { PERMISSION_SLUGS } from '../roles/roles.constants';

@ApiTags('Admin Meter - Feature Flags')
@Controller('api/v1/admin-meter/feature-flags')
export class FeatureFlagController {
  constructor(private readonly featureFlagService: FeatureFlagService) {}

  @Post()
  @Roles(PERMISSION_SLUGS.CAN_CREATE_FEATURE_FLAG)
  @ApiOperation({ summary: 'Create a new feature flag' })
  @ApiResponse({
    status: 201,
    description: 'The feature flag has been successfully created.',
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  create(@Body() createDto: CreateFeatureFlagDto, @Req() req) {
    // Assuming the user's ID is available on the request object
    const userId = req.user.id;
    return this.featureFlagService.create(createDto, userId);
  }

  @Get()
  @Roles(PERMISSION_SLUGS.CAN_VIEW_FEATURE_FLAG)
  @ApiOperation({ summary: 'Get a list of feature flags' })
  @ApiResponse({
    status: 200,
    description: 'Returns a paginated list of feature flags.',
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  findAll(@Query() listingDto: FeatureFlagListingDto) {
    return this.featureFlagService.findAll(listingDto);
  }

  @Put('update/:id')
  @Roles(PERMISSION_SLUGS.CAN_UPDATE_FEATURE_FLAG)
  @ApiOperation({ summary: 'Toggle the is_active status of a feature flag' })
  @ApiResponse({
    status: 200,
    description: 'The feature flag status has been successfully updated.',
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Not Found.' })
  featureFlagUpdate(
    @Param('id', ParseIntPipe) id: number,
    @Body() featureDto: UpdateFeatureFlagDto,
    @Req() req,
  ) {
    // Assuming the user's ID is available on the request object
    const userId = req.user.id;
    return this.featureFlagService.featureFlagUpdate(id, featureDto, userId);
  }
}
