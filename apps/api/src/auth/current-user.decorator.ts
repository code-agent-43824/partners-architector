import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { AuthUser } from './auth.types';

/** Injects the authenticated {@link AuthUser} (set by the JWT guard). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthUser }>();
    return request.user;
  },
);
