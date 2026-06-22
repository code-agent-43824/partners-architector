import { describe, expect, it } from 'vitest';

import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const passwords = new PasswordService();

  it('hashes and verifies a password', async () => {
    const secret = 'correct horse battery staple';
    const hash = await passwords.hash(secret);
    expect(hash).not.toBe(secret);
    expect(await passwords.verify(hash, secret)).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await passwords.hash('s3cret-value');
    expect(await passwords.verify(hash, 'wrong')).toBe(false);
  });

  it('returns false for a malformed hash instead of throwing', async () => {
    expect(await passwords.verify('not-a-real-hash', 'x')).toBe(false);
  });
});
