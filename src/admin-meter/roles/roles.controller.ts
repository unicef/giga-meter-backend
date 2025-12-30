import {
  Body,
  Controller,
  Delete,
  Put,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateOrUpdateRoleDto } from './roles.dto';
import { Roles } from './roles.decorator';
import { PERMISSION_SLUGS } from './roles.constants';
@ApiTags('Roles')
@Controller('api/v1/roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @Roles(PERMISSION_SLUGS.CAN_CREATE_ROLE_CONFIGURATIONS)
  @ApiOperation({ summary: 'Create a new role' })
  @ApiBody({ type: CreateOrUpdateRoleDto })
  @ApiResponse({
    status: 201,
    description: 'The role has been successfully created.',
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  create(@Body() dto: CreateOrUpdateRoleDto) {
    return this.rolesService.create(dto);
  }

  @Put(':roleId')
  @Roles(PERMISSION_SLUGS.CAN_UPDATE_ROLE_CONFIGURATIONS)
  @ApiOperation({ summary: 'Update an existing role' })
  @ApiParam({ name: 'roleId', description: 'The ID of the role to update' })
  @ApiBody({ type: CreateOrUpdateRoleDto })
  @ApiResponse({
    status: 200,
    description: 'The role has been successfully updated.',
  })
  @ApiResponse({ status: 404, description: 'Role not found.' })
  update(@Param('roleId') roleId: string, @Body() dto: CreateOrUpdateRoleDto) {
    return this.rolesService.update(Number(roleId), dto);
  }

  @Get()
  @Roles(PERMISSION_SLUGS.CAN_VIEW_ALL_ROLES)
  @ApiOperation({ summary: 'List all roles with pagination and search' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search term for role name',
  })
  @ApiResponse({ status: 200, description: 'A list of roles.' })
  list(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
  ) {
    return this.rolesService.findAll(Number(page), Number(limit), search);
  }

  @Get(':roleId')
  @Roles(PERMISSION_SLUGS.CAN_VIEW_ALL_ROLES)
  @ApiOperation({ summary: 'Get a single role by ID' })
  @ApiParam({ name: 'roleId', description: 'The ID of the role to retrieve' })
  @ApiResponse({ status: 200, description: 'The role details.' })
  @ApiResponse({ status: 404, description: 'Role not found.' })
  findOne(@Param('roleId') roleId: string) {
    return this.rolesService.findOne(Number(roleId));
  }

  @Delete(':roleId')
  @Roles(
    PERMISSION_SLUGS.CAN_DELETE_ROLE_CONFIGURATIONS,
    PERMISSION_SLUGS.CAN_CREATE_ROLE_CONFIGURATIONS,
  )
  @ApiOperation({ summary: 'Soft delete a role by ID' })
  @ApiParam({ name: 'roleId', description: 'The ID of the role to delete' })
  @ApiResponse({
    status: 200,
    description: 'The role has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Role not found.' })
  delete(@Param('roleId') roleId: string) {
    return this.rolesService.remove(Number(roleId));
  }
}
