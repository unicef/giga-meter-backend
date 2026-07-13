import { Reflector } from '@nestjs/core';
import { AdminAuthGuard } from './admin-auth.guard';
import { PrismaService } from 'src/prisma/prisma.service';

describe('AdminAuthGuard', () => {
  it('should be defined', () => {
    expect(new AdminAuthGuard(new Reflector(), {} as PrismaService)).toBeDefined();
  });
});
