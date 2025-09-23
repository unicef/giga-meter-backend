import { Test, TestingModule } from '@nestjs/testing';
import { CategoryConfigProvider } from './category-config.provider';
import { CategoryConfigService } from '../category-config/category-config.service';
import { CATEGORIES, DEFAULT_CATEGORY, CATEGORY_CONFIG, CategoryConfigType } from './category.config';

// Mock CategoryConfigService
const mockCategoryConfigService = {
  findAll: jest.fn(),
};

const dbConfigs: CategoryConfigType[] = [
  {
    id: 1,
    name: 'db_cat_1',
    isDefault: false,
    allowedAPIs: [{ url: '/api/v1/test', methods: ['GET'] }],
    notAllowedAPIs: [],
    responseFilters: {},
    allowedCountries: [],
    swagger: { visible: false },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    name: 'db_cat_2',
    isDefault: true,
    allowedAPIs: [],
    notAllowedAPIs: [{ url: '/api/v1/admin', methods: ['*'] }],
    responseFilters: {},
    allowedCountries: [],
    swagger: { visible: false },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe('CategoryConfigProvider', () => {
  let provider: CategoryConfigProvider;
  let configService: typeof mockCategoryConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryConfigProvider,
        {
          provide: CategoryConfigService,
          useValue: mockCategoryConfigService,
        },
      ],
    }).compile();

    provider = module.get<CategoryConfigProvider>(CategoryConfigProvider);
    configService = module.get(CategoryConfigService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  describe('Initialization', () => {
    it('should load configurations from the database if available', async () => {
      configService.findAll.mockResolvedValue(dbConfigs);
      await provider.onModuleInit();

      const categories = await provider.getCategories();
      const defaultCategory = await provider.getDefaultCategory();
      const allConfigs = await provider.getAllCategoryConfigs();

      expect(configService.findAll).toHaveBeenCalled();
      expect(categories).toEqual(['db_cat_1', 'db_cat_2']);
      expect(defaultCategory).toBe('db_cat_2');
      expect(allConfigs).toEqual(dbConfigs);
    });

    it('should fall back to static configuration if database fetch fails', async () => {
      configService.findAll.mockRejectedValue(new Error('DB Error'));
      await provider.onModuleInit();

      const categories = await provider.getCategories();
      const defaultCategory = await provider.getDefaultCategory();
      const allConfigs = await provider.getAllCategoryConfigs();

      expect(categories).toEqual(CATEGORIES);
      expect(defaultCategory).toEqual(DEFAULT_CATEGORY);
      expect(allConfigs).toEqual(CATEGORY_CONFIG);
    });

    it('should fall back to static configuration if database returns no configs', async () => {
        configService.findAll.mockResolvedValue([]);
        await provider.onModuleInit();
  
        const categories = await provider.getCategories();
        expect(categories).toEqual(CATEGORIES);
      });
  });

  describe('getters', () => {
    beforeEach(async () => {
        configService.findAll.mockResolvedValue(dbConfigs);
        await provider.initialize();
      });
    it('getCategories should return the list of categories', async () => {
        expect(await provider.getCategories()).toEqual(['db_cat_1', 'db_cat_2']);
    });

    it('getDefaultCategory should return the default category name', async () => {
        expect(await provider.getDefaultCategory()).toBe('db_cat_2');
    });

    it('getCategoryConfig should return the config for a specific category', async () => {
        expect(await provider.getCategoryConfig('db_cat_1')).toBe(dbConfigs[0]);
    });

    it('getAllCategoryConfigs should return all configs', async () => {
        expect(await provider.getAllCategoryConfigs()).toEqual(dbConfigs);
    });
  });

  describe('hasApiAccess', () => {
    let cat1Config: CategoryConfigType, cat2Config: CategoryConfigType;

    beforeAll(() => {
        cat1Config = dbConfigs[0];
        cat2Config = dbConfigs[1];
    });

    it('should return false if category config is not found', async () => {
        const hasAccess = await provider.hasApiAccess(null, '/any/path', 'GET');
        expect(hasAccess).toBe(false);
      });

    it('should grant access if API is in allowedAPIs', async () => {
      const hasAccess = await provider.hasApiAccess(cat1Config, '/api/v1/test', 'GET');
      expect(hasAccess).toBe(true);
    });

    it('should deny access if API is not in allowedAPIs', async () => {
      const hasAccess = await provider.hasApiAccess(cat1Config, '/api/v1/other', 'GET');
      expect(hasAccess).toBe(false);
    });

    it('should deny access if API is in notAllowedAPIs', async () => {
        const hasAccess = await provider.hasApiAccess(cat2Config, '/api/v1/admin', 'POST');
        expect(hasAccess).toBe(false);
      });

      it('should grant access if API is not in notAllowedAPIs', async () => {
        const hasAccess = await provider.hasApiAccess(cat2Config, '/api/v1/some-other-route', 'GET');
        expect(hasAccess).toBe(true);
      });

    it('should correctly match path with parameters', async () => {
        const configWithParams: CategoryConfigType = {
            id: 3,
            name: 'params_cat',
            isDefault: false,
            allowedAPIs: [{ url: '/users/{userId}/posts', methods: ['GET'] }],
            notAllowedAPIs: [],
            responseFilters: {},
            allowedCountries: [],
            swagger: { visible: false },
            createdAt: new Date(),
            updatedAt: new Date(),
          };
      const hasAccess = await provider.hasApiAccess(configWithParams, '/users/123/posts', 'GET');
      expect(hasAccess).toBe(true);
    });

    it('should correctly match wildcard method', async () => {
        const configWithWildcard: CategoryConfigType = {
            id: 4,
            name: 'wildcard_cat',
            isDefault: false,
            allowedAPIs: [{ url: '/wildcard', methods: ['*'] }],
            notAllowedAPIs: [],
            responseFilters: {},
            allowedCountries: [],
            swagger: { visible: false },
            createdAt: new Date(),
            updatedAt: new Date(),
          };
      const hasAccess = await provider.hasApiAccess(configWithWildcard, '/wildcard', 'DELETE');
      expect(hasAccess).toBe(true);
    });
  });
});
