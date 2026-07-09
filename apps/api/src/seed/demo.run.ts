import { hash } from '@node-rs/argon2';
import { PrismaClient } from '@prisma/client';

import { DEMO_DEFAULT_EMAIL, DEMO_PARTNERSHIP_NAME, seedDemo } from './demo';

/**
 * CLI entry point: `pnpm --filter @psa/api db:seed:demo`.
 *
 * Env:
 * - DEMO_ARCHITECT_PASSWORD (required) — password for the demo architect;
 *   deliberately has no default so no known credential can ever be seeded
 *   by accident. Set it server-locally; never commit it.
 * - DEMO_ARCHITECT_EMAIL (optional) — defaults to demo@partners-architector.local.
 * - DATABASE_URL — as for the base seed.
 */
async function main(): Promise<void> {
  const password = process.env.DEMO_ARCHITECT_PASSWORD;
  if (!password || password.length < 8) {
    throw new Error(
      'Set DEMO_ARCHITECT_PASSWORD (min 8 chars) to run the demo seed — it has no default on purpose.',
    );
  }
  const email = process.env.DEMO_ARCHITECT_EMAIL || DEMO_DEFAULT_EMAIL;

  const prisma = new PrismaClient();
  try {
    const passwordHash = await hash(password);
    const result = await seedDemo(prisma, { email, passwordHash });
    console.log(
      `Demo seed complete: ${result.email} / ${DEMO_PARTNERSHIP_NAME} — ` +
        `${result.clauses} clauses (${result.agreed} agreed), ${result.signoffs} sign-offs, ` +
        `${result.versions} versions. Session ${result.sessionId}.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
