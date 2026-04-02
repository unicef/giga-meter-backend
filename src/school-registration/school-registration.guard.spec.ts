import { ExecutionContext } from '@nestjs/common';
import { SchoolRegistrationGuard } from './school-registration.guard';

describe('SchoolRegistrationGuard', () => {
  let guard: SchoolRegistrationGuard;

  beforeEach(() => {
    guard = new SchoolRegistrationGuard();
  });

  afterEach(() => {
    delete process.env.GIGA_SYNC_AUTH_TOKEN;
  });

  function createContext(authorization?: string): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            authorization,
          },
        }),
      }),
    } as ExecutionContext;
  }

  it('should allow when bearer token matches env token', () => {
    process.env.GIGA_SYNC_AUTH_TOKEN = 'sync-token';

    expect(guard.canActivate(createContext('Bearer sync-token'))).toBe(true);
  });

  it('should allow when raw token matches env token', () => {
    process.env.GIGA_SYNC_AUTH_TOKEN = 'sync-token';

    expect(guard.canActivate(createContext('sync-token'))).toBe(true);
  });

  it('should reject when token is missing', () => {
    process.env.GIGA_SYNC_AUTH_TOKEN = 'sync-token';

    expect(() => guard.canActivate(createContext())).toThrow(
      'Missing authorization token',
    );
  });

  it('should reject when token does not match', () => {
    process.env.GIGA_SYNC_AUTH_TOKEN = 'sync-token';

    expect(() => guard.canActivate(createContext('Bearer wrong-token'))).toThrow(
      'Invalid giga sync token',
    );
  });
});
