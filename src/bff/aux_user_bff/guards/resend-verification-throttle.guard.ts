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
export class ResendVerificationThrottleGuard implements CanActivate {
  private static readonly MAX_ATTEMPTS = 3;
  private static readonly WINDOW_MS = 5 * 60_000;
  private static readonly attempts = new Map<string, AttemptEntry>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = request.ip ?? request.socket.remoteAddress ?? 'unknown';
    const body: unknown = request.body;
    const rawEmail =
      typeof body === 'object' &&
      body !== null &&
      'email' in body &&
      typeof body.email === 'string'
        ? body.email
        : 'unknown';
    const email = rawEmail.trim().toLowerCase();
    const key = `${ip}:${email}`;
    const now = Date.now();
    const current = ResendVerificationThrottleGuard.attempts.get(key);

    if (
      !current ||
      now - current.firstAttemptAt > ResendVerificationThrottleGuard.WINDOW_MS
    ) {
      ResendVerificationThrottleGuard.attempts.set(key, {
        count: 1,
        firstAttemptAt: now,
      });
      return true;
    }

    if (current.count >= ResendVerificationThrottleGuard.MAX_ATTEMPTS) {
      throw new HttpException(
        'Muitas solicitações de reenvio. Tente novamente em alguns minutos.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    current.count += 1;
    ResendVerificationThrottleGuard.attempts.set(key, current);
    return true;
  }
}
