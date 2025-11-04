import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { raw } from 'express';
import { ServerResponse } from 'http';

@Injectable()
export class RawBodyInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const fakeResponse: ServerResponse = <ServerResponse>{};

    const request = context.switchToHttp().getRequest();
    if (request.originalUrl === '/stripe/webhook') {
      raw({ type: 'application/json' })(request, fakeResponse, () => {});
    }
    return next.handle();
  }
}
