import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { HttpModule, HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { ValidateApiKeyDto } from './auth.dto';

const mockHttpService = () => ({
  get: jest.fn(),
});

describe('AuthGuard', () => {
  let guard: AuthGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        {
          provide: HttpService,
          useValue: mockHttpService(),
        },
      ],
      imports: [HttpModule],
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);
    process.env.USE_AUTH = 'true';
  });

  it('guard should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should return unauthorized for no bearer token', () => {
    const mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} }),
      }),
    } as ExecutionContext;

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
    } as ExecutionContext;

    mockHttpService().get.mockResolvedValueOnce(
      of({
        data: mockApiKeyDto,
      }),
    );

    await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});

function mockApiKeyDto(is_success = false): ValidateApiKeyDto {
  return {
    success: is_success,
    timestamp: '',
    data: is_success ? { has_write_access: true, countries: [] } : null,
  };
}
