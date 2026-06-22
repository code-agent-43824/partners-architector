/** Minimal surface of the Prisma client needed for a connectivity probe. */
export interface RawQueryRunner {
  $queryRaw(query: TemplateStringsArray, ...values: unknown[]): Promise<unknown>;
}

/** Returns true when a trivial query against the database succeeds. */
export async function pingDatabase(db: RawQueryRunner): Promise<boolean> {
  try {
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
