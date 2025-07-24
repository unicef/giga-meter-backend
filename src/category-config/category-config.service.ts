import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryConfigDto, UpdateCategoryConfigDto } from './category-config.dto';
import { CategoryConfig } from '@prisma/client';


@Injectable()
export class CategoryConfigService {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<CategoryConfig[]> {
    try {
      const results = await this.prisma.categoryConfig.findMany();
      return results.map(this.mapPrismaModelToInterface);
    } catch (error) {
      console.error('Error fetching category configs:', error.message);
      return [];  
    }
  }

  async findOne(id: number): Promise<CategoryConfig> {
    try {
    const result = await this.prisma.categoryConfig.findUnique({
      where: { id }
    });
    
    if (!result) {
      throw new NotFoundException(`Category config with ID ${id} not found`);
    }

    return this.mapPrismaModelToInterface(result);
  } catch (error) {
    console.error('Error fetching category config:', error.message);
    throw new NotFoundException(`Category config with ID ${id} not found`);
  }
  }

  async findByName(name: string): Promise<CategoryConfig> {
    try {
    const result = await this.prisma.categoryConfig.findUnique({
      where: { name }
    });
    
    if (!result) {
      throw new NotFoundException(`Category config with name ${name} not found`);
    }

    return this.mapPrismaModelToInterface(result);
  } catch (error) {
    console.error('Error fetching category config:', error.message);
    throw new NotFoundException(`Category config with name ${name} not found`);
  }
  }

  async findDefault(): Promise<CategoryConfig> {
    try {
    const result = await this.prisma.categoryConfig.findFirst({
      where: { isDefault: true }
    });
    
    if (!result) {
      throw new NotFoundException('No default category config found');
    }

    return this.mapPrismaModelToInterface(result);
  } catch (error) {
    console.error('Error fetching default category config:', error.message);
    throw new NotFoundException('No default category config found');
  }
  }

  async create(createCategoryConfigDto: CreateCategoryConfigDto): Promise<CategoryConfig> {
    try {
    // If this is set as default, unset any existing default
    if (createCategoryConfigDto.isDefault) {
      await this.prisma.categoryConfig.updateMany({
        where: { isDefault: true },
        data: { isDefault: false }
      });
    }
    // check if category config with name already exists
    const existingConfig = await this.prisma.categoryConfig.findUnique({
      where: { name: createCategoryConfigDto.name }
    });
    if (existingConfig) {
      throw new BadRequestException(`Category config with name ${createCategoryConfigDto.name} already exists`);
    }
    const result = await this.prisma.categoryConfig.create({
      data: {
        name: createCategoryConfigDto.name,
        isDefault: createCategoryConfigDto.isDefault || false,
        allowedAPIs: (createCategoryConfigDto.allowedAPIs ? createCategoryConfigDto.allowedAPIs : []) as any,
        notAllowedAPIs: (createCategoryConfigDto.notAllowedAPIs ? createCategoryConfigDto.notAllowedAPIs : []) as any,
        responseFilters: (createCategoryConfigDto.responseFilters ? createCategoryConfigDto.responseFilters : null) as any,
        swagger: (createCategoryConfigDto.swagger) as any
      }
    });
    return this.mapPrismaModelToInterface(result);
  } catch (error) {
    console.error('Error creating category config:', error.message);
    if (error instanceof BadRequestException) {
      throw error;
    }
    throw new Error('Failed to create category config');
  }
  }

  async update(id: number, updateCategoryConfigDto: UpdateCategoryConfigDto): Promise<CategoryConfig> {
    try {
      const category = await this.findOne(id);
      if (!category) {
        throw new NotFoundException(`Category config with id ${id} not found`);
      }

      if (updateCategoryConfigDto.isDefault) {
        await this.prisma.categoryConfig.updateMany({
          where: { isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      }

      const data = {
        name: updateCategoryConfigDto.name,
        isDefault: updateCategoryConfigDto.isDefault,
        allowedAPIs: (updateCategoryConfigDto.allowedAPIs ? updateCategoryConfigDto.allowedAPIs : undefined) as any,
        notAllowedAPIs: (updateCategoryConfigDto.notAllowedAPIs ? updateCategoryConfigDto.notAllowedAPIs : undefined) as any,
        responseFilters: (updateCategoryConfigDto.responseFilters ? updateCategoryConfigDto.responseFilters : undefined) as any,
        swagger: (updateCategoryConfigDto.swagger) as any
      };

      const result = await this.prisma.categoryConfig.update({
        where: { id },
        data,
      });

      return this.mapPrismaModelToInterface(result);
    } catch (error) {
      console.error('Error updating category config:', error.message);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to update category config`);
    }
  }

  async remove(id: number): Promise<CategoryConfig> {
    try {
      const category = await this.findOne(id);
      if (category.isDefault) {
        throw new BadRequestException('Cannot delete the default category config');
      }
      const result = await this.prisma.categoryConfig.delete({ where: { id } });
      return this.mapPrismaModelToInterface(result);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      console.error('Error deleting category config:', error.message);
      throw new BadRequestException(`Failed to delete category config: ${error.message}`);
    }
  }

  // Helper method to map Prisma model to our interface
  private mapPrismaModelToInterface(model: any): CategoryConfig {
    return {
      id: model.id,
      name: model.name,
      isDefault: model.isDefault,
      allowedAPIs: model.allowedAPIs,
      notAllowedAPIs: model.notAllowedAPIs,
      responseFilters: model.responseFilters,
      swagger: model.swagger,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt
    };
  }
}
