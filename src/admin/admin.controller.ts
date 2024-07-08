import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExcludeController,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { AdminSchoolDto } from './admin.dto';

@ApiExcludeController()
@Controller('api/v1/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('schools')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Returns the list of registered schools on the Daily Check App database',
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
    try {
      return await this.adminService.schools();
    } catch (error) {
      throw new HttpException('Failed to get schools', HttpStatus.BAD_REQUEST);
    }
  }

  @Put('blockSchools')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Block one or more Daily Check App school(s)',
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
  async blockSchools(@Body() schoolIds: number[]): Promise<boolean> {
    try {
      return await this.adminService.blockSchools(schoolIds);
    } catch (error) {
      throw new HttpException(
        'Failed to block schools',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Put('unblockSchools')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Unlock one or more Daily Check App school(s)',
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
  async unblockSchools(@Body() schoolIds: number[]): Promise<boolean> {
    try {
      return await this.adminService.unblockSchools(schoolIds);
    } catch (error) {
      throw new HttpException(
        'Failed to unblock schools',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Put('notifySchools')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Notify one or more Daily Check App school(s)',
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
  async notifySchools(@Body() schoolIds: number[]): Promise<boolean> {
    try {
      return await this.adminService.notifySchools(schoolIds);
    } catch (error) {
      throw new HttpException(
        'Failed to notify schools',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
