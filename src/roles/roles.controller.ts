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
  NotFoundException,
  InternalServerErrorException,
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
  async create(@Body() dto: CreateOrUpdateRoleDto) {
    try {
      return await this.rolesService.create(dto);
    } catch (error) {
      throw new InternalServerErrorException('Internal server error');
    }
  }

  @Put(':roleId')
  @ApiOperation({ summary: 'Update an existing role' })
  @ApiParam({ name: 'roleId', description: 'The ID of the role to update' })
  @ApiBody({ type: CreateOrUpdateRoleDto })
  @ApiResponse({
    status: 200,
    description: 'The role has been successfully updated',
  })
  @ApiResponse({ status: 404, description: 'Role not found.' })
  async update(
    @Param('roleId') roleId: string,
    @Body() dto: CreateOrUpdateRoleDto,
  ) {
    try {
      return await this.rolesService.update(Number(roleId), dto);
    } catch (error) {
      if (error instanceof NotFoundException)
        throw new NotFoundException(error.message);
      else throw new InternalServerErrorException('Internal server error');
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
  async list(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
  ) {
    try {
      return this.rolesService.findAll(Number(page), Number(limit), search);
    } catch (error) {
      throw new InternalServerErrorException('Internal server error');
    }
  }

  @Get(':roleId')
  @ApiOperation({ summary: 'Get a single role by ID' })
  @ApiParam({ name: 'roleId', description: 'The ID of the role to retrieve' })
  @ApiResponse({ status: 200, description: 'The role details.' })
  @ApiResponse({ status: 404, description: 'Role not found.' })
  async findOne(@Param('roleId') roleId: string) {
    try {
      const role = await this.rolesService.findOne(Number(roleId));
      if (!role) throw new NotFoundException('Role not found');
      role.rolePermissions = role.rolePermissions.map(
        (permission) => permission.slug,
      ) as any;
      return role;
    } catch (error) {
      throw new InternalServerErrorException('Internal server error');
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
  async delete(@Param('roleId') roleId: string) {
    try {
      await this.rolesService.remove(Number(roleId));
      return { message: 'Role deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException)
        throw new NotFoundException(error.message);
      else throw new InternalServerErrorException('Internal server error');
    }
  }
}
