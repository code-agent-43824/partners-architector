import { PrismaClient } from '@prisma/client';

import { seed } from './seed';

/** CLI entry point: `pnpm --filter @psa/api db:seed` (or `prisma db seed`). */
async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const result = await seed(prisma);
    console.log(
      `Seed complete: ${result.questions} questions; settings ${
        result.settingsCreated ? 'created' : 'already present'
      }.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
