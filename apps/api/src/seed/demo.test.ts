import { ClauseStatus } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import { DEMO_CLAUSES, DEMO_PARTNERS, DEMO_VERSIONS, DEMO_VERSIONS_BLOCK } from './demo';
import { QUESTIONS } from './questions';

const HEAVY = QUESTIONS.filter((q) => q.isSensitive).map((q) => q.number);

describe('demo seed data', () => {
  it('covers all 30 blocks exactly once with valid numbers', () => {
    const numbers = DEMO_CLAUSES.map((c) => c.number);
    expect(numbers).toHaveLength(30);
    expect(new Set(numbers).size).toBe(30);
    expect(Math.min(...numbers)).toBe(1);
    expect(Math.max(...numbers)).toBe(30);
  });

  it('holds the reference status mix for the demo walkthrough', () => {
    const byStatus = (status: ClauseStatus) =>
      DEMO_CLAUSES.filter((c) => c.status === status).map((c) => c.number);
    expect(byStatus(ClauseStatus.agreed)).toHaveLength(24);
    expect(byStatus(ClauseStatus.in_progress)).toEqual([15, 24]);
    expect(byStatus(ClauseStatus.parked)).toEqual([9, 29]);
    expect(byStatus(ClauseStatus.disputed)).toEqual([25]);
    expect(byStatus(ClauseStatus.not_applicable)).toEqual([18]);
  });

  it('keeps exactly three heavy blocks open (progress-header demo)', () => {
    const open = DEMO_CLAUSES.filter(
      (c) =>
        HEAVY.includes(c.number) &&
        c.status !== ClauseStatus.agreed &&
        c.status !== ClauseStatus.not_applicable,
    ).map((c) => c.number);
    expect(open).toEqual([9, 25, 29]);
  });

  it('every agreed block has text; «неактуально» has a reason', () => {
    for (const clause of DEMO_CLAUSES) {
      if (clause.status === ClauseStatus.agreed) {
        expect(clause.text?.trim(), `block ${clause.number}`).toBeTruthy();
      }
      if (clause.status === ClauseStatus.not_applicable) {
        expect(clause.naReason?.trim(), `block ${clause.number}`).toBeTruthy();
      }
    }
  });

  it('shares in block 5 sum to 100% across the three partners', () => {
    const shares = DEMO_CLAUSES.find((c) => c.number === 5)?.structuredData as {
      shares: { mode: string; allocations: { percent: number }[] };
    };
    expect(shares.shares.mode).toBe('manual');
    expect(shares.shares.allocations).toHaveLength(DEMO_PARTNERS.length);
    expect(shares.shares.allocations.reduce((sum, a) => sum + a.percent, 0)).toBe(100);
  });

  it('block 6 carries the meaning flags; only blocks 5/6 carry structured data', () => {
    const withData = DEMO_CLAUSES.filter((c) => c.structuredData).map((c) => c.number);
    expect(withData.sort()).toEqual([5, 6]);
    const meaning = DEMO_CLAUSES.find((c) => c.number === 6)?.structuredData as {
      meaning: Record<string, boolean>;
    };
    expect(Object.keys(meaning.meaning).sort()).toEqual([
      'losses',
      'ownership',
      'profit',
      'voting',
    ]);
  });

  it('sign-offs reference valid partners; №21/№26 stay partially confirmed', () => {
    for (const clause of DEMO_CLAUSES) {
      for (const index of clause.confirmed ?? []) {
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(DEMO_PARTNERS.length);
      }
      if (clause.confirmed && clause.confirmed.length > 0) {
        expect(clause.status).toBe(ClauseStatus.agreed);
      }
    }
    expect(DEMO_CLAUSES.find((c) => c.number === 21)?.confirmed).toHaveLength(2);
    expect(DEMO_CLAUSES.find((c) => c.number === 26)?.confirmed).toHaveLength(1);
  });

  it('history demo block has two ordered versions', () => {
    expect(DEMO_VERSIONS_BLOCK).toBe(2);
    expect(DEMO_VERSIONS).toHaveLength(2);
    expect(DEMO_VERSIONS[0]!.minutesAgo).toBeGreaterThan(DEMO_VERSIONS[1]!.minutesAgo);
  });
});
