import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';

import type { AuthUser } from '../auth/auth.types';

/**
 * Data-isolation primitive (spec SEC-5): an architect may act only on
 * resources they own; an admin is unrestricted. Used by feature modules
 * (partnerships, sessions, …) wherever a resource has an owning account.
 */
export function canAccessOwned(
  user: Pick<AuthUser, 'id' | 'role'>,
  ownerAccountId: string,
): boolean {
  if (user.role === Role.admin) {
    return true;
  }
  return user.id === ownerAccountId;
}

/** Throws ForbiddenException unless {@link canAccessOwned} allows access. */
export function assertCanAccessOwned(
  user: Pick<AuthUser, 'id' | 'role'>,
  ownerAccountId: string,
): void {
  if (!canAccessOwned(user, ownerAccountId)) {
    throw new ForbiddenException('You do not have access to this resource');
  }
}
