import { describe, expect, it } from 'vitest';

import { validateEnv } from './env';

const DATABASE_URL = 'postgresql://psa:secret@localhost:5432/psa';

describe('validateEnv', () => {
  it('accepts a valid environment and applies defaults', () => {
    const env = validateEnv({ DATABASE_URL });
    expect(env.DATABASE_URL).toBe(DATABASE_URL);
    expect(env.PORT).toBe(3000);
    expect(env.NODE_ENV).toBe('development');
  });

  it('coerces PORT to a number', () => {
    const env = validateEnv({ DATABASE_URL, PORT: '8080' });
    expect(env.PORT).toBe(8080);
  });

  it('throws when DATABASE_URL is missing', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
  });

  it('throws when NODE_ENV is not a known value', () => {
    expect(() => validateEnv({ DATABASE_URL, NODE_ENV: 'staging' })).toThrow(
      /environment configuration/i,
    );
  });
});
