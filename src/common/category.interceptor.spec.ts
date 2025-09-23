import { Test, TestingModule } from '@nestjs/testing';
import { CategoryResponseInterceptor } from './category.interceptor';
import { CategoryConfigProvider } from './category-config.provider';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, firstValueFrom } from 'rxjs';
import { CategoryConfigType } from './category.config';

// Mocks
const mockCategoryConfigProvider = {
  getDefaultCategory: jest.fn(),
  getCategoryConfig: jest.fn(),
};

const mockExecutionContext = (request: any): ExecutionContext => ({
  switchToHttp: () => ({
    getRequest: () => request,
  }),
} as any);

const mockCallHandler = (response: any): CallHandler => ({
  handle: () => of(response),
});

describe('CategoryResponseInterceptor', () => {
  let interceptor: CategoryResponseInterceptor;
  let configProvider: typeof mockCategoryConfigProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryResponseInterceptor,
        { provide: CategoryConfigProvider, useValue: mockCategoryConfigProvider },
      ],
    }).compile();

    interceptor = module.get<CategoryResponseInterceptor>(CategoryResponseInterceptor);
    configProvider = module.get(CategoryConfigProvider);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should return data as is if no filters are defined', async () => {
    const response = { data: { id: 1, name: 'test' } };
    const context = mockExecutionContext({ category: 'test', path: '/test' });
    const callHandler = mockCallHandler(response);
    configProvider.getCategoryConfig.mockResolvedValue({ responseFilters: {} });

    const result = await firstValueFrom(interceptor.intercept(context, callHandler));
    const finalResult = await result;
    expect(finalResult.data).toEqual({ id: 1, name: 'test' });
  });

  it('should return null or undefined responses as is', async () => {
    const context = mockExecutionContext({ category: 'test', path: '/test' });
    const callHandler = mockCallHandler(null);
    configProvider.getCategoryConfig.mockResolvedValue({ responseFilters: { include: ['id'] } });

    const result = await firstValueFrom(interceptor.intercept(context, callHandler));
    const finalResult = await result;
    expect(finalResult).toBeNull();
  });

  describe('Include Filters', () => {
    it('should include only specified top-level fields', async () => {
      const response = { data: { id: 1, name: 'test', secret: 'secret' } };
      const context = mockExecutionContext({ category: 'test', path: '/test' });
      const callHandler = mockCallHandler(response);
      const config: Partial<CategoryConfigType> = {
        responseFilters: { include: ['id', 'name'] },
        allowedCountries: [],
      };
      configProvider.getCategoryConfig.mockResolvedValue(config as any);

      const result = await firstValueFrom(interceptor.intercept(context, callHandler));
      const finalResult = await result;
      expect(finalResult.data).toEqual({ id: 1, name: 'test' });
      expect(finalResult.data.secret).toBeUndefined();
    });

    it('should handle nested includes', async () => {
        const response = { data: { id: 1, user: { id: 10, name: 'user', role: 'admin' } } };
        const context = mockExecutionContext({ category: 'test', path: '/test' });
        const callHandler = mockCallHandler(response);
        const config: Partial<CategoryConfigType> = {
          responseFilters: { include: ['id', 'user.id', 'user.name'] },
          allowedCountries: [],
        };
        configProvider.getCategoryConfig.mockResolvedValue(config as any);
  
        const result = await firstValueFrom(interceptor.intercept(context, callHandler));
        const finalResult = await result;
        expect(finalResult.data).toEqual({ id: 1, user: { id: 10, name: 'user' } });
      });

      it('should handle array includes', async () => {
        const response = { data: [{ id: 1, name: 'a', value: 100 }, { id: 2, name: 'b', value: 200 }] };
        const context = mockExecutionContext({ category: 'test', path: '/test' });
        const callHandler = mockCallHandler(response);
        const config: Partial<CategoryConfigType> = {
          responseFilters: { include: ['id'] },
          allowedCountries: [],
        };
        configProvider.getCategoryConfig.mockResolvedValue(config as any);
  
        const result = await firstValueFrom(interceptor.intercept(context, callHandler));
        const finalResult = await result;
        expect(finalResult.data).toEqual([{ id: 1 }, { id: 2 }]);
      });
  });

  describe('Exclude Filters', () => {
    it('should exclude specified top-level fields', async () => {
        const response = { data: { id: 1, name: 'test', secret: 'secret' } };
        const context = mockExecutionContext({ category: 'test', path: '/test' });
        const callHandler = mockCallHandler(response);
        const config: Partial<CategoryConfigType> = {
          responseFilters: { exclude: ['secret'] },
          allowedCountries: [],
        };
        configProvider.getCategoryConfig.mockResolvedValue(config as any);
  
        const result = await firstValueFrom(interceptor.intercept(context, callHandler));
        const finalResult = await result;
        expect(finalResult.data).toEqual({ id: 1, name: 'test' });
      });

      it('should handle nested excludes', async () => {
        const response = { data: { id: 1, user: { id: 10, name: 'user', role: 'admin' } } };
        const context = mockExecutionContext({ category: 'test', path: '/test' });
        const callHandler = mockCallHandler(response);
        const config: Partial<CategoryConfigType> = {
          responseFilters: { exclude: ['user.role'] },
          allowedCountries: [],
        };
        configProvider.getCategoryConfig.mockResolvedValue(config as any);
  
        const result = await firstValueFrom(interceptor.intercept(context, callHandler));
        const finalResult = await result;
        expect(finalResult.data).toEqual({ id: 1, user: { id: 10, name: 'user' } });
      });
  });

  it('should merge global and endpoint-specific filters', async () => {
    const response = { data: { id: 1, name: 'test', secret: 'secret', extra: 'field' } };
    const context = mockExecutionContext({ category: 'test', route: { path: '/specific' } });
    const callHandler = mockCallHandler(response);
    const config: Partial<CategoryConfigType> = {
      responseFilters: {
        exclude: ['secret'], // Global exclude
        endpoints: {
          '/specific': {
            exclude: ['extra'], // Endpoint-specific exclude
          },
        },
      },
      allowedCountries: [],
    };
    configProvider.getCategoryConfig.mockResolvedValue(config as any);

    const result = await firstValueFrom(interceptor.intercept(context, callHandler));
    const finalResult = await result;
    expect(finalResult.data).toEqual({ id: 1, name: 'test' });
  });
});
