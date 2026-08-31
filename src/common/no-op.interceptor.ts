import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * A no-operation interceptor that simply passes through the request
 * Used when we want to conditionally disable caching
 */
@Injectable()
export class NoOpInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Simply pass through the request without doing anything
    return next.handle();
  }
}
