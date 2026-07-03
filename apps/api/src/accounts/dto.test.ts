import { describe, expect, it } from 'vitest';

import { resetPasswordSchema } from './dto';

describe('account DTOs', () => {
  it('accepts a valid admin password reset payload', () => {
    expect(resetPasswordSchema.parse({ password: 'temporary-password' })).toEqual({
      password: 'temporary-password',
    });
  });

  it('rejects short passwords', () => {
    expect(() => resetPasswordSchema.parse({ password: 'short' })).toThrow();
  });
});
