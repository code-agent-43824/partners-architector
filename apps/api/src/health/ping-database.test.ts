import { describe, expect, it, vi } from 'vitest';

import { pingDatabase } from './ping-database';

describe('pingDatabase', () => {
  it('returns true when the query resolves', async () => {
    const db = { $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]) };
    await expect(pingDatabase(db)).resolves.toBe(true);
    expect(db.$queryRaw).toHaveBeenCalledOnce();
  });

  it('returns false when the query rejects', async () => {
    const db = { $queryRaw: vi.fn().mockRejectedValue(new Error('connection refused')) };
    await expect(pingDatabase(db)).resolves.toBe(false);
  });
});
