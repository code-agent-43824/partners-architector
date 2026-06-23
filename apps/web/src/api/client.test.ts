import { describe, expect, it } from 'vitest';

import { readCookie } from './client';

describe('readCookie', () => {
  it('extracts a cookie value', () => {
    expect(readCookie('psa_csrf', 'a=1; psa_csrf=tok123; b=2')).toBe('tok123');
  });

  it('returns null when the cookie is absent', () => {
    expect(readCookie('psa_csrf', 'a=1; b=2')).toBeNull();
    expect(readCookie('psa_csrf', '')).toBeNull();
  });

  it('url-decodes the value', () => {
    expect(readCookie('x', 'x=a%20b')).toBe('a b');
  });
});
