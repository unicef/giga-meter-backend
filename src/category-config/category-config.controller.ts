import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { CategoryConfigService } from './category-config.service';
import {
  CreateCategoryConfigDto,
  UpdateCategoryConfigDto,
  CategoryConfigDto,
  AllowedCountriesDto,
} from './category-config.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { ApiSuccessResponseDto } from '../common/common.dto';
import { CategoryConfig } from '@prisma/client';
import { Public } from 'src/common/public.decorator';

@ApiTags('Category Configuration')
@Controller('api/v1/category-config')
export class CategoryConfigController {
  constructor(private readonly categoryConfigService: CategoryConfigService) {}

  @Post()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new category configuration' })
  @ApiResponse({
    status: 201,
    description: 'The category configuration has been successfully created',
    type: CategoryConfigDto,
  })
  async create(
    @Body() createCategoryConfigDto: CreateCategoryConfigDto,
  ): Promise<ApiSuccessResponseDto<CategoryConfig>> {
    const result = await this.categoryConfigService.create(
      createCategoryConfigDto,
    );
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
      message: 'Category configuration created successfully',
    };
  }

  @Get()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all category configurations' })
  @ApiResponse({
    status: 200,
    description: 'Returns all category configurations',
    type: [CategoryConfigDto],
  })
  async findAll(): Promise<ApiSuccessResponseDto<CategoryConfig[]>> {
    const result = await this.categoryConfigService.findAll();
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
      message: 'Category configurations retrieved successfully',
    };
  }

  @Get('default')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the default category configuration' })
  @ApiResponse({
    status: 200,
    description: 'Returns the default category configuration',
    type: CategoryConfigDto,
  })
  async findDefault(): Promise<ApiSuccessResponseDto<CategoryConfig>> {
    const result = await this.categoryConfigService.findDefault();
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
      message: 'Default category configuration retrieved successfully',
    };
  }

  @Get('allowed-countries')
  @Public()
  @ApiOperation({ summary: 'Get allowed countries for each category' })
  @ApiResponse({
    status: 200,
    description: 'Returns allowed countries list for each category',
    type: [AllowedCountriesDto],
  })
  async getAllowedCountries(): Promise<
    ApiSuccessResponseDto<AllowedCountriesDto[]>
  > {
    const result = await this.categoryConfigService.getAllowedCountries();
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
      message: 'Allowed countries retrieved successfully',
    };
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a category configuration by ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the category configuration',
    type: CategoryConfigDto,
  })
  async findOne(
    @Param('id') id: string,
  ): Promise<ApiSuccessResponseDto<CategoryConfig>> {
    const result = await this.categoryConfigService.findOne(+id);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
      message: 'Category configuration retrieved successfully',
    };
  }

  @Get('name/:name')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a category configuration by name' })
  @ApiResponse({
    status: 200,
    description: 'Returns the category configuration',
    type: CategoryConfigDto,
  })
  async findByName(
    @Param('name') name: string,
  ): Promise<ApiSuccessResponseDto<CategoryConfig>> {
    const result = await this.categoryConfigService.findByName(name);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
      message: 'Category configuration retrieved successfully',
    };
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a category configuration' })
  @ApiResponse({
    status: 200,
    description: 'The category configuration has been successfully updated',
    type: CategoryConfigDto,
  })
  async update(
    @Param('id') id: string,
    @Body() updateCategoryConfigDto: UpdateCategoryConfigDto,
  ): Promise<ApiSuccessResponseDto<CategoryConfig>> {
    const result = await this.categoryConfigService.update(
      +id,
      updateCategoryConfigDto,
    );
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
      message: 'Category configuration updated successfully',
    };
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a category configuration' })
  @ApiResponse({
    status: 200,
    description: 'The category configuration has been successfully deleted',
  })
  async remove(
    @Param('id') id: string,
  ): Promise<ApiSuccessResponseDto<CategoryConfig>> {
    const result = await this.categoryConfigService.remove(+id);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
      message: 'Category configuration deleted successfully',
    };
  }
}
