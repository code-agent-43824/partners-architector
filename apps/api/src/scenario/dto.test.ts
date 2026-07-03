import { ClauseStatus } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import { saveVersionSchema, setSignoffSchema, updateClauseSchema } from './dto';

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

  it('save-version accepts an optional note', () => {
    expect(saveVersionSchema.safeParse({}).success).toBe(true);
    expect(saveVersionSchema.safeParse({ note: 'checkpoint' }).success).toBe(true);
  });
});

describe('clause structured_data (shares / meaning)', () => {
  const partnerId = '11111111-1111-1111-1111-111111111111';

  it('accepts a manual shares payload', () => {
    expect(
      updateClauseSchema.safeParse({
        structuredData: {
          shares: { mode: 'manual', allocations: [{ partnerId, percent: 50 }] },
        },
      }).success,
    ).toBe(true);
  });

  it('does not enforce sum = 100 (intermediate totals are allowed)', () => {
    expect(
      updateClauseSchema.safeParse({
        structuredData: {
          shares: { mode: 'manual', allocations: [{ partnerId, percent: 40 }] },
        },
      }).success,
    ).toBe(true);
  });

  it('accepts the four meaning-of-shares flags', () => {
    expect(
      updateClauseSchema.safeParse({
        structuredData: {
          meaning: { voting: true, profit: true, ownership: false, losses: false },
        },
      }).success,
    ).toBe(true);
  });

  it('rejects an out-of-range percent, a bad partner id, and unknown keys', () => {
    expect(
      updateClauseSchema.safeParse({
        structuredData: { shares: { mode: 'manual', allocations: [{ partnerId, percent: 120 }] } },
      }).success,
    ).toBe(false);
    expect(
      updateClauseSchema.safeParse({
        structuredData: {
          shares: { mode: 'manual', allocations: [{ partnerId: 'x', percent: 10 }] },
        },
      }).success,
    ).toBe(false);
    expect(updateClauseSchema.safeParse({ structuredData: { bogus: true } }).success).toBe(false);
  });

  it('rejects a non-manual mode (calculator is not built yet)', () => {
    expect(
      updateClauseSchema.safeParse({
        structuredData: { shares: { mode: 'calculator', allocations: [] } },
      }).success,
    ).toBe(false);
  });
});
