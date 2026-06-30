import { ClauseStatus } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import { setSignoffSchema, updateClauseSchema } from './dto';

describe('clause update DTO', () => {
  it('accepts a plain status change and a text-only save', () => {
    expect(updateClauseSchema.safeParse({ status: ClauseStatus.in_progress }).success).toBe(true);
    expect(updateClauseSchema.safeParse({ text: 'agreed wording' }).success).toBe(true);
    expect(updateClauseSchema.safeParse({ text: null, rationale: null }).success).toBe(true);
  });

  it('rejects an empty payload', () => {
    expect(updateClauseSchema.safeParse({}).success).toBe(false);
  });

  it('requires a non-empty reason for "not applicable"', () => {
    expect(updateClauseSchema.safeParse({ status: ClauseStatus.not_applicable }).success).toBe(
      false,
    );
    expect(
      updateClauseSchema.safeParse({ status: ClauseStatus.not_applicable, naReason: '  ' }).success,
    ).toBe(false);
    expect(
      updateClauseSchema.safeParse({ status: ClauseStatus.not_applicable, naReason: 'причина' })
        .success,
    ).toBe(true);
  });

  it('rejects an unknown status', () => {
    expect(updateClauseSchema.safeParse({ status: 'archived' }).success).toBe(false);
  });

  it('sign-off requires a boolean agreed', () => {
    expect(setSignoffSchema.safeParse({ agreed: true }).success).toBe(true);
    expect(setSignoffSchema.safeParse({ agreed: false }).success).toBe(true);
    expect(setSignoffSchema.safeParse({}).success).toBe(false);
    expect(setSignoffSchema.safeParse({ agreed: 'yes' }).success).toBe(false);
  });
});
