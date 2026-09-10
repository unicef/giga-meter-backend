import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { Roles } from 'src/admin-meter/roles/roles.decorator';
import { PERMISSION_SLUGS } from 'src/admin-meter/roles/roles.constants';
import { AdminAccess } from 'src/common/admin.decorator';
import { FeatureFlagService } from './feature-flag.service';
import { CreateFeatureFlagDto } from './dto/create-feature-flag.dto';
import { UpdateFeatureFlagDto } from './dto/update-feature-flag.dto';
import { CreateOverrideDto } from './dto/create-override.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AdminAuthGuard } from 'src/admin-meter/admin-auth/admin-auth.guard';
import { GetFeatureFlagsQueryDto } from './dto/get-feature-flags.dto';

@ApiTags('Admin / Feature Flags')
@UseGuards(AdminAuthGuard)
@Controller('api/v1/admin-feature-flags')
@AdminAccess()
export class FeatureFlagController {
    constructor(private readonly featureFlagService: FeatureFlagService) { }

    @Get()
    @Roles(PERMISSION_SLUGS.CAN_VIEW_FEATURE_FLAG)
    @ApiOperation({ summary: 'List all feature flags with overrides' })
    findAll(@Query() query: GetFeatureFlagsQueryDto) {
        return this.featureFlagService.findAll(query);
    }

    @Post()
    @Roles(PERMISSION_SLUGS.CAN_CREATE_FEATURE_FLAG)
    @ApiOperation({ summary: 'Create a new feature flag' })
    create(@Body() createFeatureFlagDto: CreateFeatureFlagDto) {
        return this.featureFlagService.create(createFeatureFlagDto);
    }

    @Patch(':id')
    @Roles(PERMISSION_SLUGS.CAN_UPDATE_FEATURE_FLAG)
    @ApiOperation({ summary: 'Update a feature flag' })
    update(@Param('id') id: string, @Body() updateFeatureFlagDto: UpdateFeatureFlagDto) {
        return this.featureFlagService.update(id, updateFeatureFlagDto);
    }

    @Delete(':id')
    @Roles(PERMISSION_SLUGS.CAN_UPDATE_FEATURE_FLAG) // You can map delete to update or if there's a delete permission. There is no CAN_DELETE_FEATURE_FLAG in constants.
    @ApiOperation({ summary: 'Delete a feature flag' })
    remove(@Param('id') id: string) {
        return this.featureFlagService.remove(id);
    }

    @Post(':id/overrides')
    @Roles(PERMISSION_SLUGS.CAN_UPDATE_FEATURE_FLAG)
    @ApiOperation({ summary: 'Add a scope override to a feature flag' })
    addOverride(@Param('id') id: string, @Body() createOverrideDto: CreateOverrideDto) {
        return this.featureFlagService.addOverride(id, createOverrideDto);
    }

    @Delete(':id/overrides/:overrideId')
    @Roles(PERMISSION_SLUGS.CAN_UPDATE_FEATURE_FLAG)
    @ApiOperation({ summary: 'Remove an override from a feature flag' })
    removeOverride(@Param('id') id: string, @Param('overrideId') overrideId: string) {
        return this.featureFlagService.removeOverride(id, overrideId);
    }
}
