import { describe, expect, it } from 'vitest';

import { validateEnv } from './env';

const BASE = {
  DATABASE_URL: 'postgresql://psa:secret@localhost:5432/psa',
  AUTH_JWT_SECRET: 'a-sufficiently-long-secret-value',
};

describe('validateEnv', () => {
  it('accepts a valid environment and applies defaults', () => {
    const env = validateEnv(BASE);
    expect(env.DATABASE_URL).toBe(BASE.DATABASE_URL);
    expect(env.PORT).toBe(3000);
    expect(env.NODE_ENV).toBe('development');
    expect(env.AUTH_TOKEN_TTL).toBe('7d');
    expect(env.AUTH_COOKIE_SECURE).toBe(false);
  });

  it('coerces PORT to a number', () => {
    const env = validateEnv({ ...BASE, PORT: '8080' });
    expect(env.PORT).toBe(8080);
  });

  it('reads AUTH_COOKIE_SECURE as a boolean', () => {
    expect(validateEnv({ ...BASE, AUTH_COOKIE_SECURE: 'true' }).AUTH_COOKIE_SECURE).toBe(true);
    expect(validateEnv({ ...BASE, AUTH_COOKIE_SECURE: 'false' }).AUTH_COOKIE_SECURE).toBe(false);
  });

  it('throws when DATABASE_URL is missing', () => {
    expect(() => validateEnv({ AUTH_JWT_SECRET: BASE.AUTH_JWT_SECRET })).toThrow(/DATABASE_URL/);
  });

  it('throws when AUTH_JWT_SECRET is too short', () => {
    expect(() => validateEnv({ ...BASE, AUTH_JWT_SECRET: 'short' })).toThrow(/AUTH_JWT_SECRET/);
  });

  it('throws when NODE_ENV is not a known value', () => {
    expect(() => validateEnv({ ...BASE, NODE_ENV: 'staging' })).toThrow(
      /environment configuration/i,
    );
  });
});
