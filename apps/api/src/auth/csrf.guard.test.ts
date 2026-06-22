import { type ExecutionContext, ForbiddenException } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';

import { CSRF_COOKIE, CSRF_HEADER } from './cookies';
import { CsrfGuard } from './csrf.guard';

function context(request: unknown): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

const reflector = (isPublic: boolean): Reflector =>
  ({ getAllAndOverride: () => isPublic }) as unknown as Reflector;

describe('CsrfGuard', () => {
  it('skips safe methods', () => {
    const guard = new CsrfGuard(reflector(false));
    expect(guard.canActivate(context({ method: 'GET', headers: {}, cookies: {} }))).toBe(true);
  });

  it('skips public routes', () => {
    const guard = new CsrfGuard(reflector(true));
    expect(guard.canActivate(context({ method: 'POST', headers: {}, cookies: {} }))).toBe(true);
  });

  it('passes when the header matches the cookie', () => {
    const guard = new CsrfGuard(reflector(false));
    const request = {
      method: 'POST',
      cookies: { [CSRF_COOKIE]: 'token-value' },
      headers: { [CSRF_HEADER]: 'token-value' },
    };
    expect(guard.canActivate(context(request))).toBe(true);
  });

  it('rejects a missing or mismatched token', () => {
    const guard = new CsrfGuard(reflector(false));
    expect(() =>
      guard.canActivate(
        context({
          method: 'POST',
          cookies: { [CSRF_COOKIE]: 'a' },
          headers: { [CSRF_HEADER]: 'b' },
        }),
      ),
    ).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context({ method: 'POST', cookies: {}, headers: {} }))).toThrow(
      ForbiddenException,
    );
  });
});
