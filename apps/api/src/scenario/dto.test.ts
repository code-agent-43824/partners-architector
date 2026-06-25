import { ClauseStatus } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import { updateClauseStatusSchema } from './dto';

describe('clause status DTO', () => {
  it('accepts a plain status change', () => {
    expect(updateClauseStatusSchema.safeParse({ status: ClauseStatus.in_progress }).success).toBe(
      true,
    );
  });

  it('requires a non-empty reason for "not applicable"', () => {
    expect(
      updateClauseStatusSchema.safeParse({ status: ClauseStatus.not_applicable }).success,
    ).toBe(false);
    expect(
      updateClauseStatusSchema.safeParse({ status: ClauseStatus.not_applicable, naReason: '  ' })
        .success,
    ).toBe(false);
    expect(
      updateClauseStatusSchema.safeParse({
        status: ClauseStatus.not_applicable,
        naReason: 'причина',
      }).success,
    ).toBe(true);
  });

  it('rejects an unknown status', () => {
    expect(updateClauseStatusSchema.safeParse({ status: 'archived' }).success).toBe(false);
  });
});
