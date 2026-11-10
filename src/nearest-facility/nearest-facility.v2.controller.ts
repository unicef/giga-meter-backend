import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../common/public.decorator';
import { ApiSuccessResponseDto } from '../common/common.dto';
import {
  FindNearestFacilityV2Dto,
  NearestFacilityV2ResponseDto,
} from './nearest-facility.v2.dto';
import { NearestFacilityService } from './nearest-facility.service';

@ApiTags('nearest-facility V2')
@Controller('api/v2/nearest-facility')
export class NearestFacilityV2Controller {
  constructor(private readonly nearestFacilityService: NearestFacilityService) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  @ApiOperation({ summary: 'Find the nearest school or health facility (V2)' })
  @ApiBody({ type: FindNearestFacilityV2Dto })
  @ApiResponse({
    status: 200,
    description: 'Nearest facility details with distance',
    type: NearestFacilityV2ResponseDto,
  })
  async findNearestFacility(
    @Body() dto: FindNearestFacilityV2Dto,
  ): Promise<ApiSuccessResponseDto<NearestFacilityV2ResponseDto>> {
    if (!dto.facility_type) {
      throw new BadRequestException(
        'facility_type is required and must be "school" or "health"',
      );
    }

    const data = await this.nearestFacilityService.findNearest(
      dto.latitude,
      dto.longitude,
      dto.facility_type,
    );

    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
      message: 'success',
    };
  }
}
