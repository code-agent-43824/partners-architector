import { describe, expect, it } from 'vitest';

import { changePasswordSchema, loginSchema, registerSchema } from './dto';

describe('auth DTOs', () => {
  it('accepts a valid password change payload', () => {
    expect(
      changePasswordSchema.parse({
        currentPassword: 'old-password',
        newPassword: 'new-password',
      }),
    ).toEqual({
      currentPassword: 'old-password',
      newPassword: 'new-password',
    });
  });

  it('rejects a short new password', () => {
    expect(() =>
      changePasswordSchema.parse({ currentPassword: 'old-password', newPassword: 'short' }),
    ).toThrow();
  });

  it('keeps existing auth DTO contracts', () => {
    expect(registerSchema.safeParse({ email: 'bad', password: 'password-1' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'user@example.com', password: 'x' }).success).toBe(true);
  });
});
