import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T = unknown> {
  status: string;
  message: string;
  data: T;
  meta?: Record<string, any>;
}

@Injectable()
export class TransformResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        if (data && typeof data === 'object' && 'status' in data) {
          return data as unknown as ApiResponse<T>;
        }
        return {
          status: 'success',
          message: 'Request successful',
          data,
        };
      }),
    );
  }
}
