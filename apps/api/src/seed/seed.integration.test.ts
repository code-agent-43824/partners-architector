import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { QUESTION_SET_VERSION, QUESTIONS } from './questions';
import { seed } from './seed';

// Runs only with a reachable, migrated database (TEST_DATABASE_URL set), so
// `pnpm test` stays green without one.
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)('seed (integration)', () => {
  let prisma: PrismaClient | undefined;

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: url ?? '' } } });
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it('is idempotent and loads all 30 questions in order', async () => {
    await seed(prisma!);
    await seed(prisma!); // a second run must not duplicate rows

    const rows = await prisma!.question.findMany({
      where: { questionSetVersion: QUESTION_SET_VERSION },
      orderBy: { number: 'asc' },
    });

    expect(rows).toHaveLength(QUESTIONS.length);
    expect(rows.map((row) => row.number)).toEqual(QUESTIONS.map((q) => q.number));
    expect(rows.filter((row) => row.isSensitive).map((row) => row.number)).toEqual([
      5, 6, 9, 20, 21, 25, 26, 27, 28, 29,
    ]);
  });

  it('ensures a single settings row', async () => {
    await seed(prisma!);
    expect(await prisma!.settings.count()).toBe(1);
  });
});
