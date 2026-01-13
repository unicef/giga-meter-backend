import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { ApiSuccessResponseDto } from '../common/common.dto';
import {
  CountryConfigDto,
  CreateCountryConfigDto,
  UpdateCountryConfigDto,
  PaginatedCountryConfigDto,
} from './country-config.dto';
import { CountryConfigService } from './country-config.service';

@ApiTags('Country Configuration')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('api/v1/country-config')
export class CountryConfigController {
  constructor(private readonly countryConfigService: CountryConfigService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a country configuration for a specific country',
  })
  @ApiResponse({
    status: 201,
    description: 'Country configuration created successfully',
    type: CountryConfigDto,
  })
  async create(
    @Body() dto: CreateCountryConfigDto,
  ): Promise<ApiSuccessResponseDto<CountryConfigDto>> {
    const result = await this.countryConfigService.create(dto);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
      message: 'Country configuration created successfully',
    };
  }

  @Get()
  @ApiOperation({
    summary: 'List every country configuration sorted by country code',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Zero-based page index to retrieve',
    example: 0,
  })
  @ApiQuery({
    name: 'size',
    required: false,
    description: 'Maximum number of configurations per page (1-100)',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Country configurations retrieved successfully',
    type: PaginatedCountryConfigDto,
  })
  async findAll(
    @Query('page', new DefaultValuePipe(0), ParseIntPipe) page: number,
    @Query('size', new DefaultValuePipe(10), ParseIntPipe) size: number,
  ): Promise<ApiSuccessResponseDto<PaginatedCountryConfigDto>> {
    const sanitizedPage = Math.max(0, page);
    const sanitizedSize = Math.max(1, Math.min(size, 100));
    const result = await this.countryConfigService.findAll({
      page: sanitizedPage,
      size: sanitizedSize,
    });
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
      message: 'Country configurations retrieved successfully',
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a single country configuration by its identifier',
  })
  @ApiResponse({
    status: 200,
    description: 'Country configuration retrieved successfully',
    type: CountryConfigDto,
  })
  async findOne(
    @Param('code') id: string,
  ): Promise<ApiSuccessResponseDto<CountryConfigDto>> {
    const result = await this.countryConfigService.findOne(+id);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
      message: 'Country configuration retrieved successfully',
    };
  }
  @Get('/code/:code')
  @ApiOperation({
    summary: 'Get a single country configuration by its country code',
  })
  @ApiResponse({
    status: 200,
    description: 'Country configuration retrieved successfully',
    type: CountryConfigDto,
  })
  async findByCode(
    @Param('code') code: string,
  ): Promise<ApiSuccessResponseDto<CountryConfigDto>> {
    const result = await this.countryConfigService.findByCode(code);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
      message: 'Country configuration retrieved successfully',
    };
  }
  @Patch('/code/:code')
  @ApiOperation({
    summary:
      'Update the measurement provider or options for a country configuration',
  })
  @ApiResponse({
    status: 200,
    description: 'Country configuration updated successfully',
    type: CountryConfigDto,
  })
  async updateByCode(
    @Param('code') code: string,
    @Body() dto: UpdateCountryConfigDto,
  ): Promise<ApiSuccessResponseDto<CountryConfigDto>> {
    const result = await this.countryConfigService.updateByCode(code, dto);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
      message: 'Country configuration updated successfully',
    };
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Update the measurement provider or options for a country configuration',
  })
  @ApiResponse({
    status: 200,
    description: 'Country configuration updated successfully',
    type: CountryConfigDto,
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCountryConfigDto,
  ): Promise<ApiSuccessResponseDto<CountryConfigDto>> {
    const result = await this.countryConfigService.update(+id, dto);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
      message: 'Country configuration updated successfully',
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an existing country configuration' })
  @ApiResponse({
    status: 200,
    description: 'Country configuration deleted successfully',
    type: CountryConfigDto,
  })
  async remove(
    @Param('id') id: string,
  ): Promise<ApiSuccessResponseDto<CountryConfigDto>> {
    const result = await this.countryConfigService.remove(+id);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
      message: 'Country configuration deleted successfully',
    };
  }
}
