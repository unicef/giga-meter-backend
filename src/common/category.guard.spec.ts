import { Test, TestingModule } from '@nestjs/testing';
import { CategoryGuard } from './category.guard';
import { Reflector } from '@nestjs/core';
import { CategoryConfigProvider } from './category-config.provider';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { IS_PUBLIC_KEY } from './public.decorator';
import { CATEGORY_KEY } from './category.decorator';

// Mocks
const mockReflector = {
  getAllAndOverride: jest.fn(),
  get: jest.fn(),
};

const mockCategoryConfigProvider = {
  getCategoryConfig: jest.fn(),
  getDefaultCategory: jest.fn(),
  hasApiAccess: jest.fn(),
};

const mockExecutionContext = (request: any): ExecutionContext => ({
  switchToHttp: () => ({
    getRequest: () => request,
  }),
  getHandler: () => { function a() {} return a },
  getClass: () => { class A {} return A },
} as any);

describe('CategoryGuard', () => {
  let guard: CategoryGuard;
  let reflector: typeof mockReflector;
  let configProvider: typeof mockCategoryConfigProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: CategoryConfigProvider, useValue: mockCategoryConfigProvider },
      ],
    }).compile();

    guard = module.get<CategoryGuard>(CategoryGuard);
    reflector = module.get(Reflector);
    configProvider = module.get(CategoryConfigProvider);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access to the /metrics endpoint', async () => {
    const context = mockExecutionContext({ url: '/metrics' });
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should allow access if the route is public', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const context = mockExecutionContext({ url: '/public/route' });
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [expect.any(Function), expect.any(Function)]);
  });

  it('should throw ForbiddenException if category config does not exist', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    configProvider.getDefaultCategory.mockResolvedValue('default');
    configProvider.getCategoryConfig.mockResolvedValue(null);
    const context = mockExecutionContext({ path: '/some/path', method: 'GET' });

    await expect(guard.canActivate(context)).rejects.toThrow(
      new ForbiddenException("Category 'default' not found"),
    );
  });

  describe('With Required Categories', () => {
    it('should allow access if category is in the required list', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      reflector.get.mockReturnValue(['admin', 'super']);
      configProvider.getCategoryConfig.mockResolvedValue({ name: 'admin' });
      const context = mockExecutionContext({ path: '/admin/path', method: 'GET', category: 'admin' });

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should deny access if category is not in the required list', async () => {
        reflector.getAllAndOverride.mockReturnValue(false);
        reflector.get.mockReturnValue(['admin']);
        configProvider.getCategoryConfig.mockResolvedValue({ name: 'user' });
        const context = mockExecutionContext({ path: '/admin/path', method: 'GET', category: 'user' });
  
        await expect(guard.canActivate(context)).rejects.toThrow(
          new ForbiddenException('This endpoint requires one of these categories: admin'),
        );
      });
  });

  describe('With General API Access', () => {
    const mockConfig = { name: 'test' };
    beforeEach(() => {
        reflector.getAllAndOverride.mockReturnValue(false);
        reflector.get.mockReturnValue(undefined); // No specific categories required
        configProvider.getCategoryConfig.mockResolvedValue(mockConfig);
        configProvider.getDefaultCategory.mockResolvedValue('test');
    });

    it('should allow access if hasApiAccess returns true', async () => {
        configProvider.hasApiAccess.mockResolvedValue(true);
        const context = mockExecutionContext({ path: '/allowed/path', method: 'GET' });
  
        const result = await guard.canActivate(context);
        expect(result).toBe(true);
        expect(configProvider.hasApiAccess).toHaveBeenCalledWith(mockConfig, '/allowed/path', 'GET');
      });
  
      it('should deny access if hasApiAccess returns false', async () => {
        configProvider.hasApiAccess.mockResolvedValue(false);
        const context = mockExecutionContext({ path: '/forbidden/path', method: 'POST' });
  
        await expect(guard.canActivate(context)).rejects.toThrow(
          new ForbiddenException('Unauthorized to access POST /forbidden/path'),
        );
        expect(configProvider.hasApiAccess).toHaveBeenCalledWith(mockConfig, '/forbidden/path', 'POST');
      });
  });

  it('should attach the category to the request object', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    reflector.get.mockReturnValue(undefined);
    configProvider.getCategoryConfig.mockResolvedValue({ name: 'default' });
    configProvider.getDefaultCategory.mockResolvedValue('default');
    configProvider.hasApiAccess.mockResolvedValue(true);
    const request = { path: '/some/path', method: 'GET' };
    const context = mockExecutionContext(request);

    await guard.canActivate(context);

    expect(request['category']).toBe('default');
  });
});
