import { Reflector } from '@nestjs/core';
import * as Sentry from '@sentry/node';
import { AdminAuthGuard } from './admin-auth.guard';
import { PrismaService } from 'src/prisma/prisma.service';

jest.mock('@sentry/node', () => ({ captureException: jest.fn() }));

describe('AdminAuthGuard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(new AdminAuthGuard(new Reflector(), {} as PrismaService)).toBeDefined();
  });

  describe('getSigningKey', () => {
    const lookUpKeyFailingWith = (err: Error) => {
      const guard = new AdminAuthGuard(new Reflector(), {} as PrismaService);
      guard['jwksClient'] = {
        getSigningKey: (_kid: string, cb: (err: Error, key: any) => void) =>
          cb(err, null),
      } as any;
      const callback = jest.fn();
      guard['getSigningKey']({ kid: 'some-kid' }, callback);
      return callback;
    };

    it('does not report a token signed with a key B2C does not publish', () => {
      const unknownKid = Object.assign(new Error('Unable to find a signing key'), {
        name: 'SigningKeyNotFoundError',
      });

      const callback = lookUpKeyFailingWith(unknownKid);

      expect(callback).toHaveBeenCalledWith(unknownKid, null);
      expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    it('reports the B2C keys endpoint being unreachable', () => {
      const unreachable = Object.assign(new Error('connect ETIMEDOUT'), {
        name: 'JwksError',
      });

      const callback = lookUpKeyFailingWith(unreachable);

      expect(callback).toHaveBeenCalledWith(unreachable, null);
      expect(Sentry.captureException).toHaveBeenCalledWith(unreachable);
    });
  });
});
