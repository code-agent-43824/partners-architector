import { describe, expect, it } from 'vitest';

import { changePasswordSchema, loginSchema, registerSchema, updatePreferencesSchema } from './dto';

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

describe('preferences DTO', () => {
  it('requires a boolean guidedMode and nothing else', () => {
    expect(updatePreferencesSchema.safeParse({ guidedMode: true }).success).toBe(true);
    expect(updatePreferencesSchema.safeParse({ guidedMode: false }).success).toBe(true);
    expect(updatePreferencesSchema.safeParse({}).success).toBe(false);
    expect(updatePreferencesSchema.safeParse({ guidedMode: 'yes' }).success).toBe(false);
  });
});
