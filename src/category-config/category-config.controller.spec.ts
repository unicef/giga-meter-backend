import { Test, TestingModule } from '@nestjs/testing';
import { CategoryConfigController } from './category-config.controller';
import { CategoryConfigService } from './category-config.service';
import { AuthGuard } from '../auth/auth.guard';
import { HttpModule } from '@nestjs/axios';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  CreateCategoryConfigDto,
  UpdateCategoryConfigDto,
} from './category-config.dto';

describe('CategoryConfigController', () => {
  let controller: CategoryConfigController;
  let service: CategoryConfigService;

  const mockCategoryConfig = {
    id: 1,
    name: 'test-category',
    isDefault: false,
    allowedAPIs: [
      {
        url: '/api/test',
        methods: ['GET', 'POST'],
      },
    ],
    notAllowedAPIs: [
      {
        url: '/api/restricted',
        methods: ['DELETE'],
      },
    ],
    responseFilters: {
      include: ['id', 'name'],
      exclude: ['password'],
      endpoints: {
        '/api/test': {
          include: ['id'],
        },
      },
    },
    swagger: {
      visible: true,
      title: 'Test API',
      description: 'Test API description',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCategoryConfigService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findDefault: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoryConfigController],
      providers: [
        {
          provide: CategoryConfigService,
          useValue: mockCategoryConfigService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            reset: jest.fn(),
          },
        },
        {
          provide: APP_GUARD,
          useClass: AuthGuard,
        },
        {
          provide: APP_GUARD,
          useClass: ThrottlerGuard,
        },
      ],
      imports: [
        HttpModule,
        ThrottlerModule.forRoot([
          {
            ttl: 60,
            limit: 10,
          },
        ]),
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({
        canActivate: () => Promise.resolve(true),
      })
      .compile();

    controller = module.get<CategoryConfigController>(CategoryConfigController);
    service = module.get<CategoryConfigService>(CategoryConfigService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new category config', async () => {
      const createDto: CreateCategoryConfigDto = {
        name: 'test-category',
        isDefault: false,
        allowedAPIs: [
          {
            url: '/api/test',
            methods: ['GET', 'POST'],
          },
        ],
        notAllowedAPIs: [
          {
            url: '/api/restricted',
            methods: ['DELETE'],
          },
        ],
        responseFilters: {
          include: ['id', 'name'],
          exclude: ['password'],
          endpoints: {
            '/api/test': {
              include: ['id'],
            },
          },
        },
        swagger: {
          visible: true,
          title: 'Test API',
          description: 'Test API description',
        },
      };

      mockCategoryConfigService.create.mockResolvedValue(mockCategoryConfig);

      const result = await controller.create(createDto);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCategoryConfig);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findAll', () => {
    it('should return an array of category configs', async () => {
      const categoryConfigs = [mockCategoryConfig];
      mockCategoryConfigService.findAll.mockResolvedValue(categoryConfigs);

      const result = await controller.findAll();

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findDefault', () => {
    it('should return the default category config', async () => {
      mockCategoryConfigService.findDefault.mockResolvedValue(
        mockCategoryConfig,
      );

      const result = await controller.findDefault();

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCategoryConfig);
      expect(service.findDefault).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a category config by id', async () => {
      const id = '1';
      mockCategoryConfigService.findOne.mockResolvedValue(mockCategoryConfig);

      const result = await controller.findOne(id);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCategoryConfig);
      expect(service.findOne).toHaveBeenCalledWith(Number(id));
    });
  });

  describe('update', () => {
    it('should update a category config', async () => {
      const id = '1';
      const updateDto: UpdateCategoryConfigDto = {
        name: 'test1',
        isDefault: true,
        swagger: {
          visible: false,
          title: 'Updated API',
          description: 'Updated description',
        },
        allowedAPIs: [
          {
            url: '/api/updated',
            methods: ['GET'],
          },
        ],
      };
      const updatedConfig = { ...mockCategoryConfig, ...updateDto };

      mockCategoryConfigService.update.mockResolvedValue(updatedConfig);

      const result = await controller.update(id, updateDto);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedConfig);
      expect(service.update).toHaveBeenCalledWith(Number(id), updateDto);
    });
  });

  describe('remove', () => {
    it('should remove a category config', async () => {
      const id = '1';
      mockCategoryConfigService.remove.mockResolvedValue(mockCategoryConfig);

      const result = await controller.remove(id);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(service.remove).toHaveBeenCalledWith(Number(id));
    });
  });
});
