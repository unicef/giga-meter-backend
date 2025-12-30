import {
  BadRequestException,
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
  Put,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  DeactivateDeviceResponseDto,
  RequestSchoolsAdminDto,
  toggleIsActiveDeviceDto,
} from './school.dto';
import { SchoolsService } from './schools.service';
import { ApiSuccessResponseDto } from 'src/common/common.dto';

@ApiTags('Users Management')
@Controller('api/v1/admin-meter-school')
export class SchoolsController {
  constructor(private readonly schoolService: SchoolsService) {}

  @Post('school-with-device')
  @ApiOperation({
    summary:
      'Returns the list of registered schools on the Giga Meter database',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the list of schools',
    type: Object,
    isArray: true,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized; Invalid api key provided',
  })
  async getSchoolsAdmin(
    @Body() bodyRequest: RequestSchoolsAdminDto,
  ): Promise<any> {
    try {
      return this.schoolService.getSchoolsAndDeviceCount(bodyRequest);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put('toggle-device-status')
  @ApiOperation({
    summary: 'Deactivate a device by setting is_active toggle',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns whether the device was successfully toggled',
    type: DeactivateDeviceResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request; Missing or invalid parameters',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized; Invalid api key provided',
  })
  async toggleIsActiveDevice(
    @Body() reqDto: toggleIsActiveDeviceDto,
  ): Promise<ApiSuccessResponseDto<DeactivateDeviceResponseDto>> {
    return this.schoolService.toggleIsActiveDevice(reqDto) as any;
  }
}
