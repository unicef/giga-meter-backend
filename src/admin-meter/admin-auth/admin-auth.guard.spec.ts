import { AdminAuthGuard } from './admin-auth.guard';

describe('AdminAuthGuard', () => {
  it('should be defined', () => {
    expect(new AdminAuthGuard()).toBeDefined();
  });
});
