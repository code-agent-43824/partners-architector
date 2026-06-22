import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { CSRF_COOKIE, CSRF_HEADER } from './cookies';
import { IS_PUBLIC_KEY } from './public.decorator';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

interface CsrfRequest {
  method: string;
  cookies?: Record<string, string | undefined>;
  headers: Record<string, string | string[] | undefined>;
}

/**
 * Double-submit CSRF check: mutating requests must echo the CSRF cookie in the
 * x-csrf-token header. Safe methods and @Public routes are exempt.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<CsrfRequest>();
    if (SAFE_METHODS.has(request.method)) {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const cookie = request.cookies?.[CSRF_COOKIE];
    const header = request.headers[CSRF_HEADER];
    if (!cookie || typeof header !== 'string' || header !== cookie) {
      throw new ForbiddenException('Invalid CSRF token');
    }
    return true;
  }
}
