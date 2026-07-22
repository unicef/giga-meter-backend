import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiExcludeController,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AuthGuard } from '../auth/auth.guard';
import { AdminSchoolDto } from './admin.dto';
import { RequiredCategories } from 'src/common/category.decorator';

@ApiExcludeController()
@Controller('api/v1/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('schools')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Returns the list of registered schools on the Giga Meter database',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the list of schools',
    type: AdminSchoolDto,
    isArray: true,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized; Invalid api key provided',
  })
  async getSchools(): Promise<AdminSchoolDto[]> {
    return await this.adminService.schools();
  }

  @Put('blockSchools')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Block one or more Giga Meter school(s)',
  })
  @ApiResponse({
    status: 200,
    description: 'Schools blocked successfully',
    type: String,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized; Invalid api key provided',
  })
  @ApiBody({
    type: Number,
    isArray: true,
  })
  async blockSchools(@Body() schoolIds: number[]): Promise<boolean> {
    if (!schoolIds || schoolIds.length === 0)
      throw new HttpException(
        'schoolIds is null/empty',
        HttpStatus.BAD_REQUEST,
      );

    return await this.adminService.blockSchools(schoolIds);
  }

  @Put('unblockSchools')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Unlock one or more Giga Meter school(s)',
  })
  @ApiResponse({
    status: 200,
    description: 'Schools unblocked successfully',
    type: String,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized; Invalid api key provided',
  })
  @ApiBody({
    type: Number,
    isArray: true,
  })
  async unblockSchools(@Body() schoolIds: number[]): Promise<boolean> {
    if (!schoolIds || schoolIds.length === 0)
      throw new HttpException(
        'schoolIds is null/empty',
        HttpStatus.BAD_REQUEST,
      );

    return await this.adminService.unblockSchools(schoolIds);
  }

  @Put('notifySchools')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Notify one or more Giga Meter school(s)',
  })
  @ApiResponse({
    status: 200,
    description: 'Schools notified successfully',
    type: String,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized; Invalid api key provided',
  })
  @ApiBody({
    type: Number,
    isArray: true,
  })
  async notifySchools(@Body() schoolIds: number[]): Promise<boolean> {
    if (!schoolIds || schoolIds.length === 0)
      throw new HttpException(
        'schoolIds is null/empty',
        HttpStatus.BAD_REQUEST,
      );

    return await this.adminService.notifySchools(schoolIds);
  }

  @Put('assign-role/:id')
  @RequiredCategories('admin')
  async assignRoleToUser(
    @Param('id') id: number,
    @Body('roleId') roleId: number,
  ): Promise<any> {
    try {
      return this.adminService.assignRoleToUser(id, roleId);
    } catch (error) {
      throw new InternalServerErrorException('Error assigning role to user');
    }
  }
}
