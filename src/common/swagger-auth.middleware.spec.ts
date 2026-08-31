import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { Request, Response } from 'express';
import { SwaggerAuthMiddleware } from './swagger-auth.middleware';
import { AuthGuard } from '../auth/auth.guard';

describe('SwaggerAuthMiddleware', () => {
  let middleware: SwaggerAuthMiddleware;
  let mockAuthGuard: Partial<AuthGuard>;

  beforeEach(async () => {
    mockAuthGuard = {
      validateToken: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SwaggerAuthMiddleware,
        {
          provide: AuthGuard,
          useValue: mockAuthGuard,
        },
      ],
    }).compile();

    middleware = module.get<SwaggerAuthMiddleware>(SwaggerAuthMiddleware);
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  it('should allow access with a valid token and matching category', async () => {
    const mockReq = createMock<Request>({
      originalUrl: '/api/test',
      query: { token: 'valid-token' },
    });
    const mockRes = createMock<Response>();
    const mockNext = jest.fn();

    (mockAuthGuard.validateToken as jest.Mock).mockImplementation(async (token, req) => {
      req.category = 'test';
      return true;
    });

    await middleware.use(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should deny access with an invalid token', async () => {
    const mockReq = createMock<Request>({
      originalUrl: '/api/test',
      query: { token: 'invalid-token' },
    });
    const mockRes = createMock<Response>();
    const mockNext = jest.fn();
    mockRes.status = jest.fn().mockReturnThis();
    mockRes.send = jest.fn();

    (mockAuthGuard.validateToken as jest.Mock).mockResolvedValue(false);

    await middleware.use(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should deny access if categories do not match', async () => {
    const mockReq = createMock<Request>({
      originalUrl: '/api/admin',
      query: { token: 'valid-token' },
    });
    const mockRes = createMock<Response>();
    const mockNext = jest.fn();
    mockRes.status = jest.fn().mockReturnThis();
    mockRes.send = jest.fn();

    (mockAuthGuard.validateToken as jest.Mock).mockImplementation(async (token, req) => {
      req.category = 'test'; // User's category
      return true;
    });

    await middleware.use(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should bypass for non-api documentation routes', async () => {
    const mockReq = createMock<Request>({ originalUrl: '/api/v1/endpoint' });
    const mockRes = createMock<Response>();
    const mockNext = jest.fn();

    await middleware.use(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });
});
