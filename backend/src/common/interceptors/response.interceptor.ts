import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  StreamableFile,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  Record<string, unknown> | T
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Record<string, unknown> | T> {
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((data) => {
        if (response.statusCode === 204) {
          return data;
        }

        if (data instanceof StreamableFile) {
          return data;
        }

        return {
          success: true,
          data,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
