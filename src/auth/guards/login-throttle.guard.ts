import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';

type AttemptEntry = {
  count: number;
  firstAttemptAt: number;
};

@Injectable()
export class LoginThrottleGuard implements CanActivate {
  private static readonly MAX_ATTEMPTS = 5;
  private static readonly WINDOW_MS = 60_000;
  private static readonly attempts = new Map<string, AttemptEntry>();

  static resetAttempt(request: Request) {
    const ip = request.ip ?? request.socket.remoteAddress ?? 'unknown';
    const username =
      typeof request.body?.username === 'string' ? request.body.username : 'unknown';
    const key = `${ip}:${username.toLowerCase()}`;
    LoginThrottleGuard.attempts.delete(key);
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = request.ip ?? request.socket.remoteAddress ?? 'unknown';
    const username =
      typeof request.body?.username === 'string' ? request.body.username : 'unknown';
    const key = `${ip}:${username.toLowerCase()}`;
    const now = Date.now();
    const current = LoginThrottleGuard.attempts.get(key);

    if (!current || now - current.firstAttemptAt > LoginThrottleGuard.WINDOW_MS) {
      LoginThrottleGuard.attempts.set(key, {
        count: 1,
        firstAttemptAt: now,
      });
      return true;
    }

    if (current.count >= LoginThrottleGuard.MAX_ATTEMPTS) {
      throw new HttpException(
        'Too many login attempts. Try again in a minute.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    current.count += 1;
    LoginThrottleGuard.attempts.set(key, current);
    return true;
  }
}
