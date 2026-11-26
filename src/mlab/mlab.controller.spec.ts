import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AuthGuard } from '../auth/auth.guard';
import { MlabController } from './mlab.controller';
import { MlabTokenService } from './mlab-token.service';

describe('MlabController', () => {
  let controller: MlabController;
  let getLocateToken: jest.Mock;

  beforeEach(async () => {
    getLocateToken = jest
      .fn()
      .mockResolvedValue({ token: 'jwt', locate_url: null });
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MlabController],
      providers: [{ provide: MlabTokenService, useValue: { getLocateToken } }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get(MlabController);
  });

  it('answers in the shape the app reads', async () => {
    const response = await controller.getLocateToken();

    expect(response).toEqual({
      success: true,
      data: { token: 'jwt', locate_url: null },
      timestamp: expect.any(String),
      message: '',
    });
  });

  it('needs an API key', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      MlabController.prototype.getLocateToken,
    );
    expect(guards).toContain(AuthGuard);
  });
});
