import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { HttpModule } from '@nestjs/axios';
import { JwtService } from '@nestjs/jwt';

describe('AuthController', () => {
  let controller: AuthController;
  let service: JwtService;
  const mockToken = 'mock-jwt-token';

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthGuard,
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue(mockToken),
          },
        },
      ],
      imports: [HttpModule],
    }).compile();

    controller = app.get<AuthController>(AuthController);
    service = app.get<JwtService>(JwtService);
  });

  it('controller should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('service should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('GenerateToken', () => {
    it('should throw error if secret is invalid', async () => {
      await expect(controller.generateToken('aa')).rejects.toThrow(
        'Invalid admin secret',
      );
    });

    it('should get token if secret is valid', async () => {
      process.env.ADMIN_SECRET = 'secret';

      const response = await controller.generateToken('secret');
      expect(response).toStrictEqual({ token: mockToken });
    });
  });
});
