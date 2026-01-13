import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SchoolService } from './school.service';
import { AuthGuard } from '../auth/auth.guard';
import {
  AddRecordResponseDto,
  ApiSuccessResponseDto,
} from '../common/common.dto';
import {
  CheckNotifyDto,
  CheckExistingInstallationDto,
  CheckDeviceStatusDto,
  DeactivateDeviceDto,
  DeactivateDeviceResponseDto,
  SchoolDto,
} from './school.dto';
import { Countries, WriteAccess } from '../common/common.decorator';
import { DynamicResponse } from 'src/utility/decorators';
import { GetConnectivityRecordsDto } from 'src/connectivity/connectivity.dto';
import { ConnectivityService } from 'src/connectivity/connectivity.service';
import { ValidateSize } from '../common/validation.decorator';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { getRateLimitConfig } from 'src/config/rate-limit.config';
import { CacheInterCeptorOptional } from 'src/config/cache.config';

@ApiTags('Schools')
@Controller('api/v1/dailycheckapp_schools')
@UseGuards(ThrottlerGuard)
@Throttle(getRateLimitConfig('schools'))
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class SchoolController {
  constructor(
    private readonly schoolService: SchoolService,
    private readonly connectivityService: ConnectivityService,
  ) {}

  @Get('')
  @UseInterceptors(CacheInterCeptorOptional)
  @ApiOperation({
    summary:
      'Returns the list of registered schools on the Giga Meter database',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the list of schools',
    type: SchoolDto,
    isArray: true,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized; Invalid api key provided',
  })
  @ApiQuery({
    name: 'country_iso3_code',
    description: 'The ISO3 code of a country, eg: IND',
    required: false,
    type: 'string',
  })
  @ApiQuery({
    name: 'giga_id_school',
    description:
      'The GIGA id of a school, eg: 2abb47dd-3fca-44b1-b6c8-0ec0c863c236',
    required: false,
    type: 'string',
  })
  @ApiQuery({
    name: 'size',
    description: 'The number of schools to return, default: 10',
    required: false,
    type: 'number',
  })
  @ApiQuery({
    name: 'page',
    description:
      'The number of pages to skip before starting to collect the result, eg: if page=2 and size=10, it will skip 20 (2*10) records, default: 0',
    required: false,
    type: 'number',
  })
  async getSchools(
    @Query('page') page?: number,
    @ValidateSize({ min: 1, max: 100 })
    @Query('size')
    size?: number,
    @Query('giga_id_school') giga_id_school?: string,
    @Query('country_iso3_code') country_iso3_code?: string,
    @WriteAccess() write_access?: boolean,
    @Countries() countries?: string[],
  ): Promise<ApiSuccessResponseDto<SchoolDto[]>> {
    const schools = await this.schoolService.schools(
      (page ?? 0) * (size ?? 10),
      (size ?? 10) * 1,
      giga_id_school,
      country_iso3_code,
      write_access,
      countries,
    );

    return {
      success: true,
      data: schools,
      timestamp: new Date().toISOString(),
      message: 'success',
    };
  }

  @Get(':giga_id_school/connectivity')
  @DynamicResponse({ summary: 'Get all connectivity checks' })
  findConnectivityRecords(
    @Param('giga_id_school') giga_id_school: string,
    @Query() query: GetConnectivityRecordsDto,
  ) {
    return this.connectivityService.findAll({
      giga_id_school,
      ...query,
    });
  }

  @Get(':giga_id_school')
  @ApiOperation({
    summary:
      'Returns the list of schools on the Giga Meter database by giga id school',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the list of schools',
    type: SchoolDto,
    isArray: true,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized; Invalid api key provided',
  })
  @ApiParam({
    name: 'giga_id_school',
    description: 'The giga id school',
    required: true,
    type: 'string',
  })
  async getSchoolsByGigaId(
    @Param('giga_id_school') giga_id_school: string,
    @WriteAccess() write_access?: boolean,
    @Countries() countries?: string[],
  ): Promise<ApiSuccessResponseDto<SchoolDto[]>> {
    if (!giga_id_school || giga_id_school.trim().length === 0)
      throw new HttpException(
        'giga_id_school is null/empty',
        HttpStatus.BAD_REQUEST,
      );

    const schools = await this.schoolService.schoolsByGigaId(
      giga_id_school.toLowerCase(),
      write_access,
      countries,
    );

    return {
      success: true,
      data: schools,
      timestamp: new Date().toISOString(),
      message: 'success',
    };
  }

  @Get('id/:id')
  @ApiOperation({
    summary: 'Returns the list of schools on the Giga Meter database by id',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the list of schools',
    type: SchoolDto,
    isArray: true,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized; Invalid api key provided',
  })
  @ApiParam({
    name: 'id',
    description: 'The id of school',
    required: true,
    type: 'number',
  })
  async getSchoolsById(
    @Param('id') id: number,
  ): Promise<ApiSuccessResponseDto<SchoolDto[]>> {
    if (!id || id === 0)
      throw new HttpException('id is zero/empty', HttpStatus.BAD_REQUEST);

    const schools = await this.schoolService.schoolsById(id);

    return {
      success: true,
      data: schools,
      timestamp: new Date().toISOString(),
      message: 'success',
    };
  }

  @Get('country_id/:country_id')
  @ApiOperation({
    summary:
      'Returns the list of schools on the Giga Meter database by country id',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the list of schools',
    type: SchoolDto,
    isArray: true,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized; Invalid api key provided',
  })
  @ApiParam({
    name: 'country_id',
    description: 'The country id',
    required: true,
    type: 'string',
  })
  async getSchoolsByCountryId(
    @Param('country_id') country_id: string,
    @WriteAccess() write_access?: boolean,
    @Countries() countries?: string[],
  ): Promise<ApiSuccessResponseDto<SchoolDto[]>> {
    if (!country_id || country_id.trim().length === 0)
      throw new HttpException(
        'country_id is null/empty',
        HttpStatus.BAD_REQUEST,
      );
    // TODO:// remove this logic after adding countries to non expired api keys
    if (!write_access && !countries?.includes(country_id.toUpperCase())) {
      throw new HttpException(
        'not authorized to access',
        HttpStatus.BAD_REQUEST,
      );
    }

    const schools = await this.schoolService.schoolsByCountryId(
      country_id.toUpperCase(),
    );

    return {
      success: true,
      data: schools,
      timestamp: new Date().toISOString(),
      message: 'success',
    };
  }

  @Get('checkExistingInstallation/:device_hardware_id')
  @ApiOperation({
    summary:
      'Check if an existing installation is present for a specific device hardware id',
  })
  @ApiResponse({
    status: 200,
    description:
      'Returns whether installation exists, and if so, the user_id and giga_id_school',
    type: CheckExistingInstallationDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized; Invalid api key provided',
  })
  @ApiParam({
    name: 'device_hardware_id',
    description: 'The device hardware id to check',
    required: true,
    type: 'string',
  })
  async checkExistingInstallation(
    @Param('device_hardware_id') device_hardware_id: string,
  ): Promise<ApiSuccessResponseDto<CheckExistingInstallationDto>> {
    if (!device_hardware_id || device_hardware_id.trim().length === 0)
      throw new HttpException(
        'device_hardware_id is null/empty',
        HttpStatus.BAD_REQUEST,
      );

    const result =
      await this.schoolService.checkExistingInstallation(device_hardware_id);

    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
      message: 'success',
    };
  }

  @Get('checkDeviceStatus/:device_hardware_id/:giga_id_school')
  @ApiOperation({
    summary:
      'Check if a device has been deactivated (logged out) by another user',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns whether the device is active or has been deactivated',
    type: CheckDeviceStatusDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request; Missing or invalid parameters',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized; Invalid api key provided',
  })
  @ApiParam({
    name: 'device_hardware_id',
    description: 'The device hardware id to check',
    required: true,
    type: 'string',
  })
  @ApiParam({
    name: 'giga_id_school',
    description: 'The GIGA id of the school',
    required: true,
    type: 'string',
  })
  async checkDeviceStatus(
    @Param('device_hardware_id') device_hardware_id: string,
    @Param('giga_id_school') giga_id_school: string,
  ): Promise<ApiSuccessResponseDto<CheckDeviceStatusDto>> {
    if (!device_hardware_id || device_hardware_id.trim().length === 0) {
      throw new HttpException(
        'device_hardware_id is null/empty',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!giga_id_school || giga_id_school.trim().length === 0) {
      throw new HttpException(
        'giga_id_school is null/empty',
        HttpStatus.BAD_REQUEST,
      );
    }

    const result = await this.schoolService.checkDeviceStatus(
      device_hardware_id,
      giga_id_school,
    );

    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
      message: result.message,
    };
  }

  @Get('checkNotify/:user_id')
  @ApiExcludeEndpoint()
  @ApiOperation({
    summary: 'Check to notify a Giga Meter school',
  })
  @ApiResponse({
    status: 200,
    description:
      'true if school needs to be notified else false along with app download url',
    type: CheckNotifyDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized; Invalid api key provided',
  })
  @ApiParam({
    name: 'user_id',
    description: 'The user id of school',
    required: true,
    type: 'string',
  })
  async checkNotify(
    @Param('user_id') user_id: string,
  ): Promise<ApiSuccessResponseDto<CheckNotifyDto>> {
    if (!user_id || user_id.trim().length === 0)
      throw new HttpException('user_id is null/empty', HttpStatus.BAD_REQUEST);

    const notify = await this.schoolService.checkNotify(user_id);

    return {
      success: true,
      data: { notify, download_url: process.env.PCDC_APP_DOWNLOAD_URL },
      timestamp: new Date().toISOString(),
      message: 'success',
    };
  }

  @Post()
  @ApiOperation({
    summary: 'Register a school in to the Giga Meter database',
  })
  @ApiResponse({
    status: 201,
    description: 'Returns Id of school created',
    type: String,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized; Invalid api key provided',
  })
  async createSchool(
    @Body() schoolDto: SchoolDto,
  ): Promise<ApiSuccessResponseDto<AddRecordResponseDto>> {
    const schoolId = await this.schoolService.createSchool(schoolDto);

    return {
      success: true,
      data: { user_id: schoolId },
      timestamp: new Date().toISOString(),
      message: 'success',
    };
  }

  @Put('deactivate')
  @ApiOperation({
    summary: 'Deactivate a device by setting is_active to false',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns whether the device was successfully deactivated',
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
  async deactivateDevice(
    @Body() deactivateDto: DeactivateDeviceDto,
  ): Promise<ApiSuccessResponseDto<DeactivateDeviceResponseDto>> {
    if (
      !deactivateDto.device_hardware_id ||
      deactivateDto.device_hardware_id.trim().length === 0
    ) {
      throw new HttpException(
        'device_hardware_id is null/empty',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (
      !deactivateDto.giga_id_school ||
      deactivateDto.giga_id_school.trim().length === 0
    ) {
      throw new HttpException(
        'giga_id_school is null/empty',
        HttpStatus.BAD_REQUEST,
      );
    }

    const result = await this.schoolService.deactivateDevice(
      deactivateDto.device_hardware_id,
      deactivateDto.giga_id_school,
    );

    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
      message: result.message || 'success',
    };
  }
}
