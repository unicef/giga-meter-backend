import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { HttpModule, HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import * as Sentry from '@sentry/node';
import { ValidateApiKeyDto } from './auth.dto';
import { Reflector } from '@nestjs/core';
import { CategoryConfigProvider } from '../common/category-config.provider';
import { mockCategoryConfigProvider } from 'src/common/mock-objects';

jest.mock('@sentry/node', () => ({ captureException: jest.fn() }));

const mockHttpService = () => ({
  get: jest.fn(),
});

const mockReflector = {
  getAllAndOverride: jest.fn().mockReturnValue(false), // Default to false, adjust as needed
};

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        {
          provide: HttpService,
          useValue: mockHttpService(),
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: CategoryConfigProvider,
          useValue: mockCategoryConfigProvider,
        },
      ],
      imports: [HttpModule],
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);
    // The imported HttpModule shadows the mock for module.get, so take the
    // instance the guard was built with.
    httpService = guard['httpService'];
    process.env.USE_AUTH = 'true';
    jest.clearAllMocks();
  });

  it('guard should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should return unauthorized for no bearer token', () => {
    const mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should return unauthorized for invalid bearer token', async () => {
    const mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { authorization: 'Bearer invalid_token' },
        }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;

    mockHttpService().get.mockResolvedValueOnce(
      of({
        data: mockApiKeyDto,
      }),
    );

    await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('does not report a key that Project Connect rejects', async () => {
    const rejected = Object.assign(new Error('Unauthorized'), {
      response: { status: 401 },
    });
    jest.spyOn(httpService, 'get').mockReturnValueOnce(throwError(() => rejected));

    await expect(guard.validateToken('bad_key', {})).resolves.toBe(false);
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('reports Project Connect being unreachable', async () => {
    const unreachable = Object.assign(new Error('connect ECONNREFUSED'), {
      code: 'ECONNREFUSED',
    });
    jest.spyOn(httpService, 'get').mockReturnValueOnce(throwError(() => unreachable));

    await expect(guard.validateToken('some_key', {})).resolves.toBe(false);
    expect(Sentry.captureException).toHaveBeenCalledWith(unreachable);
  });

  it('reports Project Connect failing with a 5xx', async () => {
    const failed = Object.assign(new Error('Bad Gateway'), {
      response: { status: 502 },
    });
    jest.spyOn(httpService, 'get').mockReturnValueOnce(throwError(() => failed));

    await expect(guard.validateToken('some_key', {})).resolves.toBe(false);
    expect(Sentry.captureException).toHaveBeenCalledWith(failed);
  });
});

function mockApiKeyDto(is_success = false): ValidateApiKeyDto {
  return {
    success: is_success,
    timestamp: '',
    data: is_success ? { has_write_access: true, countries: [] } : null,
  };
}
