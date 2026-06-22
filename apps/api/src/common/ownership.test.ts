import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import { assertCanAccessOwned, canAccessOwned } from './ownership';

describe('ownership (data isolation, SEC-5)', () => {
  it('lets an architect access their own resource', () => {
    expect(canAccessOwned({ id: 'a', role: Role.architect }, 'a')).toBe(true);
  });

  it("blocks an architect from another architect's resource", () => {
    expect(canAccessOwned({ id: 'a', role: Role.architect }, 'b')).toBe(false);
    expect(() => assertCanAccessOwned({ id: 'a', role: Role.architect }, 'b')).toThrow(
      ForbiddenException,
    );
  });

  it('lets an admin access any resource', () => {
    expect(canAccessOwned({ id: 'admin', role: Role.admin }, 'someone-else')).toBe(true);
  });

  it('blocks a non-owner client', () => {
    expect(canAccessOwned({ id: 'c', role: Role.client }, 'other')).toBe(false);
  });
});
