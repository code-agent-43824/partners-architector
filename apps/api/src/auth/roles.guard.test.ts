import { type ExecutionContext, ForbiddenException } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import { RolesGuard } from './roles.guard';

function context(user: unknown): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

function reflectorReturning(roles: Role[] | undefined): Reflector {
  return { getAllAndOverride: () => roles } as unknown as Reflector;
}

describe('RolesGuard', () => {
  it('allows when no roles are required', () => {
    const guard = new RolesGuard(reflectorReturning(undefined));
    expect(guard.canActivate(context({ id: '1', role: Role.architect }))).toBe(true);
  });

  it('allows when the user has a required role', () => {
    const guard = new RolesGuard(reflectorReturning([Role.admin]));
    expect(guard.canActivate(context({ id: '1', role: Role.admin }))).toBe(true);
  });

  it('denies when the user lacks the required role', () => {
    const guard = new RolesGuard(reflectorReturning([Role.admin]));
    expect(() => guard.canActivate(context({ id: '1', role: Role.architect }))).toThrow(
      ForbiddenException,
    );
  });

  it('denies when unauthenticated', () => {
    const guard = new RolesGuard(reflectorReturning([Role.admin]));
    expect(() => guard.canActivate(context(undefined))).toThrow(ForbiddenException);
  });
});
