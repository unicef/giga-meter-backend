import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const Countries = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const allowedCategoryCountries = request.category_allowed_countries || [];
    return allowedCategoryCountries.length > 0
      ? (request.allowed_countries || []).filter((code: string) => allowedCategoryCountries.includes(code))
      : request.allowed_countries;
  },
);

export const CountriesIso3 = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const allowedCategoryCountries = request.category_allowed_countries || [];
    return allowedCategoryCountries.length > 0
      ? (request.allowed_countries_iso3 || []).filter((code: string) => allowedCategoryCountries.includes(request.allowed_countries_map?.[code]))
      : request.allowed_countries_iso3;
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

export const Category = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.category?.toLowerCase();
  },
);
