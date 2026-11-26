import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import {
  DEFAULT_MLAB_TOKEN_EXCHANGE_URL,
  MlabTokenService,
} from './mlab-token.service';

describe('MlabTokenService', () => {
  const env = { ...process.env };
  let service: MlabTokenService;
  let post: jest.Mock;
  let warn: jest.SpyInstance;

  beforeEach(async () => {
    delete process.env.MLAB_API_KEY;
    delete process.env.MLAB_TOKEN_EXCHANGE_URL;
    delete process.env.MLAB_LOCATE_URL;
    post = jest.fn().mockReturnValue(of({ data: { token: 'jwt' } }));
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MlabTokenService,
        { provide: HttpService, useValue: { post } },
      ],
    }).compile();
    service = module.get(MlabTokenService);
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    process.env = { ...env };
    jest.restoreAllMocks();
  });

  it('offers nothing while no API key is set, so the app uses the public lookup', async () => {
    await expect(service.getLocateToken()).resolves.toEqual({
      token: null,
      locate_url: null,
    });
    expect(post).not.toHaveBeenCalled();
  });

  it('exchanges the API key for a token at M-Lab', async () => {
    process.env.MLAB_API_KEY = 'mlabk.ki_test.secret';

    await expect(service.getLocateToken()).resolves.toEqual({
      token: 'jwt',
      locate_url: null,
    });
    expect(post).toHaveBeenCalledWith(DEFAULT_MLAB_TOKEN_EXCHANGE_URL, {
      api_key: 'mlabk.ki_test.secret',
    });
  });

  it('uses the configured exchange and lookup URLs', async () => {
    process.env.MLAB_API_KEY = 'mlabk.ki_test.secret';
    process.env.MLAB_TOKEN_EXCHANGE_URL =
      'https://auth.mlab-sandbox.measurementlab.net/v0/token/integration';
    process.env.MLAB_LOCATE_URL =
      'https://locate.mlab-sandbox.measurementlab.net/v2/priority/nearest/ndt/ndt7';

    await expect(service.getLocateToken()).resolves.toEqual({
      token: 'jwt',
      locate_url:
        'https://locate.mlab-sandbox.measurementlab.net/v2/priority/nearest/ndt/ndt7',
    });
    expect(post.mock.calls[0][0]).toBe(
      'https://auth.mlab-sandbox.measurementlab.net/v0/token/integration',
    );
  });

  it('passes a lookup URL on without a key', async () => {
    process.env.MLAB_LOCATE_URL = 'https://locate.example.org/v2/p?key=k';

    await expect(service.getLocateToken()).resolves.toEqual({
      token: null,
      locate_url: 'https://locate.example.org/v2/p?key=k',
    });
    expect(post).not.toHaveBeenCalled();
  });

  it('asks for a new token every time: they last 20 seconds', async () => {
    process.env.MLAB_API_KEY = 'mlabk.ki_test.secret';

    await service.getLocateToken();
    await service.getLocateToken();

    expect(post).toHaveBeenCalledTimes(2);
  });

  it('offers nothing when M-Lab refuses the key, without logging it', async () => {
    process.env.MLAB_API_KEY = 'mlabk.ki_test.secret';
    process.env.MLAB_LOCATE_URL = 'https://locate.example.org/v2/p';
    post.mockReturnValue(
      throwError(() => ({
        message: 'Request failed with status code 401',
        response: { status: 401 },
        config: { data: '{"api_key":"mlabk.ki_test.secret"}' },
      })),
    );

    await expect(service.getLocateToken()).resolves.toEqual({
      token: null,
      locate_url: null,
    });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('HTTP 401'));
    expect(JSON.stringify(warn.mock.calls)).not.toContain('secret');
  });

  it('offers nothing when the exchange times out or sends no token', async () => {
    process.env.MLAB_API_KEY = 'mlabk.ki_test.secret';

    post.mockReturnValue(
      throwError(() => ({ message: 'timeout of 3000ms exceeded' })),
    );
    await expect(service.getLocateToken()).resolves.toEqual({
      token: null,
      locate_url: null,
    });

    post.mockReturnValue(of({ data: { error: 'nope' } }));
    await expect(service.getLocateToken()).resolves.toEqual({
      token: null,
      locate_url: null,
    });
  });
});
