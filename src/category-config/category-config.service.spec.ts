import { Test, TestingModule } from '@nestjs/testing';
import { CategoryConfigService } from './category-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CategoryConfig as PrismaCategoryConfig } from '@prisma/client';
import {
  CreateCategoryConfigDto,
  UpdateCategoryConfigDto,
} from './category-config.dto';
import { CategoryConfigProvider } from '../common/category-config.provider';

// Extended type to include allowedCountries field
type CategoryConfig = PrismaCategoryConfig & {
  allowedCountries: string[];
};

// Mock Prisma Service
const mockPrismaService = {
  categoryConfig: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
};

const mockCategoryConfig: CategoryConfig = {
  id: 1,
  name: 'Test Category',
  isDefault: false,
  allowedAPIs: [],
  notAllowedAPIs: [],
  responseFilters: {},
  allowedCountries: [],
  swagger: { visible: false },
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('CategoryConfigService', () => {
  let service: CategoryConfigService;
  let prisma: typeof mockPrismaService;

  const mockCategoryConfigProvider = {
    getAllCategoryConfigs: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryConfigService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CategoryConfigProvider,
          useValue: mockCategoryConfigProvider,
        },
      ],
    }).compile();

    service = module.get<CategoryConfigService>(CategoryConfigService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of category configs', async () => {
      prisma.categoryConfig.findMany.mockResolvedValue([mockCategoryConfig]);
      const result = await service.findAll();
      expect(result).toEqual([mockCategoryConfig]);
      expect(prisma.categoryConfig.findMany).toHaveBeenCalled();
    });

    it('should return an empty array on error', async () => {
      prisma.categoryConfig.findMany.mockRejectedValue(new Error('DB Error'));
      const result = await service.findAll();
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a single category config', async () => {
      prisma.categoryConfig.findUnique.mockResolvedValue(mockCategoryConfig);
      const result = await service.findOne(1);
      expect(result).toEqual(mockCategoryConfig);
      expect(prisma.categoryConfig.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw NotFoundException if config not found', async () => {
      prisma.categoryConfig.findUnique.mockResolvedValue(null);
      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByName', () => {
    it('should return a single category config by name', async () => {
      prisma.categoryConfig.findUnique.mockResolvedValue(mockCategoryConfig);
      const result = await service.findByName('Test Category');
      expect(result).toEqual(mockCategoryConfig);
      expect(prisma.categoryConfig.findUnique).toHaveBeenCalledWith({
        where: { name: 'Test Category' },
      });
    });

    it('should throw NotFoundException if config not found', async () => {
      prisma.categoryConfig.findUnique.mockResolvedValue(null);
      await expect(service.findByName('NonExistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findDefault', () => {
    it('should return the default category config', async () => {
      const defaultCategory = { ...mockCategoryConfig, isDefault: true };
      prisma.categoryConfig.findFirst.mockResolvedValue(defaultCategory);
      const result = await service.findDefault();
      expect(result).toEqual(defaultCategory);
      expect(prisma.categoryConfig.findFirst).toHaveBeenCalledWith({
        where: { isDefault: true },
      });
    });

    it('should throw NotFoundException if no default config found', async () => {
      prisma.categoryConfig.findFirst.mockResolvedValue(null);
      await expect(service.findDefault()).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const createDto: CreateCategoryConfigDto = {
      name: 'New Category',
      isDefault: false,
      allowedAPIs: [],
      notAllowedAPIs: [],
      responseFilters: {},
      allowedCountries: [],
      swagger: { visible: false },
    };
    it('should create a new category config', async () => {
      const newCategory = { ...mockCategoryConfig, ...createDto, id: 2 };
      prisma.categoryConfig.findUnique.mockResolvedValue(null);
      prisma.categoryConfig.create.mockResolvedValue(newCategory);

      const result = await service.create(createDto);
      expect(result).toEqual(newCategory);
      expect(prisma.categoryConfig.create).toHaveBeenCalledWith({
        data: expect.any(Object),
      });
    });

    it('should throw BadRequestException if category name already exists', async () => {
      prisma.categoryConfig.findUnique.mockResolvedValue(mockCategoryConfig);
      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should unset other defaults when creating a new default', async () => {
      const createDefaultDto = { ...createDto, isDefault: true };
      const newCategory = { ...mockCategoryConfig, ...createDefaultDto, id: 2 };
      prisma.categoryConfig.findUnique.mockResolvedValue(null);
      prisma.categoryConfig.create.mockResolvedValue(newCategory);

      await service.create(createDefaultDto);
      expect(prisma.categoryConfig.updateMany).toHaveBeenCalledWith({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    });
  });

  describe('update', () => {
    const updateDto: UpdateCategoryConfigDto = {
      name: 'Updated Category',
      swagger: { visible: false },
    };
    it('should update a category config', async () => {
      const updatedCategory = { ...mockCategoryConfig, ...updateDto };
      prisma.categoryConfig.findUnique.mockResolvedValue(mockCategoryConfig); // For the findOne check
      prisma.categoryConfig.update.mockResolvedValue(updatedCategory);

      const result = await service.update(1, updateDto);
      expect(result).toEqual(updatedCategory);
      expect(prisma.categoryConfig.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.any(Object),
      });
    });

    it('should throw NotFoundException if category to update is not found', async () => {
      prisma.categoryConfig.findUnique.mockResolvedValue(null);
      await expect(service.update(99, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should unset other defaults when setting a new default', async () => {
      const updateDefaultDto = { ...updateDto, isDefault: true };
      const updatedCategory = { ...mockCategoryConfig, ...updateDefaultDto };
      prisma.categoryConfig.findUnique.mockResolvedValue(mockCategoryConfig);
      prisma.categoryConfig.update.mockResolvedValue(updatedCategory);

      await service.update(1, updateDefaultDto);
      expect(prisma.categoryConfig.updateMany).toHaveBeenCalledWith({
        where: { isDefault: true, id: { not: 1 } },
        data: { isDefault: false },
      });
    });
  });

  describe('remove', () => {
    it('should remove a category config', async () => {
      prisma.categoryConfig.findUnique.mockResolvedValue(mockCategoryConfig);
      prisma.categoryConfig.delete.mockResolvedValue(mockCategoryConfig);

      const result = await service.remove(1);
      expect(result).toEqual(mockCategoryConfig);
      expect(prisma.categoryConfig.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw NotFoundException if category to remove is not found', async () => {
      prisma.categoryConfig.findUnique.mockResolvedValue(null);
      await expect(service.remove(99)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when trying to delete the default category', async () => {
      const defaultCategory = { ...mockCategoryConfig, isDefault: true };
      prisma.categoryConfig.findUnique.mockResolvedValue(defaultCategory);
      await expect(service.remove(1)).rejects.toThrow(BadRequestException);
      expect(prisma.categoryConfig.delete).not.toHaveBeenCalled();
    });
  });
});
