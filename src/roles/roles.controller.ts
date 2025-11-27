import {
  Body,
  Controller,
  Delete,
  Put,
  Get,
  Param,
  Post,
  Query,
  Res,
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
@ApiTags('Roles')
@Controller('api/v1/roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new role' })
  @ApiBody({ type: CreateOrUpdateRoleDto })
  @ApiResponse({
    status: 201,
    description: 'The role has been successfully created.',
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  create(@Body() dto: CreateOrUpdateRoleDto, @Res() res: any) {
    try {
      return this.rolesService.create(dto);
    } catch (error) {
      return res.status(404).json({ message: 'Bad Request' });
    }
  }

  @Put(':roleId')
  @ApiOperation({ summary: 'Update an existing role' })
  @ApiParam({ name: 'roleId', description: 'The ID of the role to update' })
  @ApiBody({ type: CreateOrUpdateRoleDto })
  @ApiResponse({
    status: 200,
    description: 'The role has been successfully updated.',
  })
  @ApiResponse({ status: 404, description: 'Role not found.' })
  update(
    @Param('roleId') roleId: string,
    @Body() dto: CreateOrUpdateRoleDto,
    @Res() res: any,
  ) {
    try {
      return this.rolesService.update(Number(roleId), dto);
    } catch (error) {
      return res.status(404).json({ message: 'Role not found' });
    }
  }

  @Get()
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
  @ApiOperation({ summary: 'Get a single role by ID' })
  @ApiParam({ name: 'roleId', description: 'The ID of the role to retrieve' })
  @ApiResponse({ status: 200, description: 'The role details.' })
  @ApiResponse({ status: 404, description: 'Role not found.' })
  findOne(@Param('roleId') roleId: string, @Res() res: any) {
    try {
      return this.rolesService.findOne(Number(roleId));
    } catch (error) {
      return res.status(404).json({ message: 'Role not found' });
    }
  }

  @Delete(':roleId')
  @ApiOperation({ summary: 'Soft delete a role by ID' })
  @ApiParam({ name: 'roleId', description: 'The ID of the role to delete' })
  @ApiResponse({
    status: 200,
    description: 'The role has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Role not found.' })
  async delete(@Param('roleId') roleId: string, @Res() res: any) {
    try {
      await this.rolesService.remove(Number(roleId));
      return res.status(200).json({ message: 'Role deleted successfully' });
    } catch (error) {
      return res.status(404).json({ message: 'Role not found' });
    }
  }
}
