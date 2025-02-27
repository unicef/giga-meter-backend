import { createParamDecorator, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';

export const ValidateSize = createParamDecorator(
  (data: { min?: number; max?: number } = {}, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const size = request.query.size ? parseInt(request.query.size, 10) : 10;
    const min = data.min ?? 1;
    const max = data.max ?? 100;

    if (size < min || size > max) {
      throw new HttpException(
        `Size parameter must be between ${min} and ${max}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    return size;
  },
);
