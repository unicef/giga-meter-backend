import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const Countries = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.allowed_countries;
  },
);

export const WriteAccess = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.has_write_access;
  },
);
