import { SessionKind } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import { createSessionSchema } from './dto';

const UUID = '11111111-1111-4111-8111-111111111111';

describe('session DTOs', () => {
  it('accepts an initial session without a baseline', () => {
    expect(createSessionSchema.safeParse({ kind: SessionKind.initial }).success).toBe(true);
    expect(
      createSessionSchema.safeParse({ kind: SessionKind.initial, title: 'Kickoff' }).success,
    ).toBe(true);
  });

  it('rejects an initial session that references a baseline', () => {
    expect(
      createSessionSchema.safeParse({ kind: SessionKind.initial, baselineSessionId: UUID }).success,
    ).toBe(false);
  });

  it('requires a baseline for a review session', () => {
    expect(createSessionSchema.safeParse({ kind: SessionKind.review }).success).toBe(false);
    expect(
      createSessionSchema.safeParse({ kind: SessionKind.review, baselineSessionId: UUID }).success,
    ).toBe(true);
  });

  it('rejects an unknown kind and a non-uuid baseline', () => {
    expect(createSessionSchema.safeParse({ kind: 'family' }).success).toBe(false);
    expect(
      createSessionSchema.safeParse({ kind: SessionKind.review, baselineSessionId: 'nope' })
        .success,
    ).toBe(false);
  });
});
