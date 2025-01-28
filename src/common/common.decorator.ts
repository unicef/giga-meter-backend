import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const Countries = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.allowed_countries;
  },
);

export const CountriesIso3 = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.allowed_countries_iso3;
  },
);

export const WriteAccess = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.has_write_access;
  },
);

export const IsSuperUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.is_super_user;
  },
);
