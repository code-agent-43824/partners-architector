import { describe, expect, it } from 'vitest';

import { isUserRole, USER_ROLES } from './index';

describe('USER_ROLES', () => {
  it('contains exactly the three product roles in order', () => {
    expect([...USER_ROLES]).toEqual(['admin', 'architect', 'client']);
  });
});

describe('isUserRole', () => {
  it('accepts every known role', () => {
    for (const role of USER_ROLES) {
      expect(isUserRole(role)).toBe(true);
    }
  });

  it('rejects unknown or non-string values', () => {
    expect(isUserRole('owner')).toBe(false);
    expect(isUserRole('')).toBe(false);
    expect(isUserRole(42)).toBe(false);
    expect(isUserRole(null)).toBe(false);
    expect(isUserRole(undefined)).toBe(false);
  });
});
