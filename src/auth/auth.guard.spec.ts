import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { HttpModule, HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { ValidateApiKeyDto } from './auth.dto';
import { JwtService } from '@nestjs/jwt';

const mockHttpService = () => ({
  get: jest.fn(),
});
const mockJwtService = () => ({
  verify: jest.fn(),
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
        {
          provide: JwtService,
          useValue: mockJwtService(),
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

  it('should return authorized for valid jwt token', async () => {
    const mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { authorization: 'Bearer jwt_token' },
        }),
      }),
    } as ExecutionContext;

    mockJwtService().verify.mockResolvedValue(true);
    await expect(guard.canActivate(mockExecutionContext)).resolves.toBeTruthy();
  });

  it('should return authorized for valid giga token', async () => {
    const mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { authorization: 'Bearer access_token' },
        }),
      }),
    } as ExecutionContext;

    mockJwtService().verify.mockRejectedValue(
      new UnauthorizedException('invalid token'),
    );

    mockHttpService().get.mockResolvedValueOnce(
      of({
        data: mockApiKeyDto,
      }),
    );

    await expect(guard.canActivate(mockExecutionContext)).resolves.toBeTruthy();
  });
});

function mockApiKeyDto(is_success = false): ValidateApiKeyDto {
  return {
    success: is_success,
    timestamp: '',
    data: is_success ? { has_write_access: true, countries: [] } : null,
  };
}
