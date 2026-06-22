import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Integration test: requires a reachable PostgreSQL with migrations applied.
// Skipped unless TEST_DATABASE_URL is set, so `pnpm test` stays green without
// a database. The verification harness applies migrations (prisma migrate
// deploy) against this URL before running it.
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)('database schema (integration)', () => {
  let prisma: PrismaClient | undefined;

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: url ?? '' } } });
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it('connects and answers a trivial query', async () => {
    const rows = await prisma!.$queryRaw<Array<{ ok: number }>>`SELECT 1 AS ok`;
    expect(rows[0]?.ok).toBe(1);
  });

  it('has the core tables from the initial migration', async () => {
    const rows = await prisma!.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
    const names = new Set(rows.map((row) => row.table_name));
    for (const table of ['account', 'partnership', 'partner', 'session', 'question', 'clause']) {
      expect(names.has(table), `missing table ${table}`).toBe(true);
    }
  });

  it('has the pgvector extension enabled', async () => {
    const rows = await prisma!.$queryRaw<Array<{ extname: string }>>`
      SELECT extname FROM pg_extension WHERE extname = 'vector'`;
    expect(rows).toHaveLength(1);
  });
});
