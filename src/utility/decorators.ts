import { applyDecorators } from '@nestjs/common';
import {
  ApiResponse,
  ApiOperation,
  ApiOperationOptions,
  ApiParam,
} from '@nestjs/swagger';

export function DynamicResponse(options: ApiOperationOptions) {
  return applyDecorators(
    ApiOperation(options),
    ApiResponse({ status: 200, description: 'Success' }),
    ApiResponse({ status: 400, description: 'Bad Request' }),
  );
}
export function IdParam(resource: string) {
  return applyDecorators(
    ApiParam({
      name: 'id',
      required: true,
      type: Number,
      description: `The ID of the ${resource}`,
    }),
  );
}
