import { describe, expect, it } from 'vitest';

import { parsePespFile, pespPayloadSchema, updateZonesSchema } from './dto';

const validReport = {
  format: 'psa-pesp-v0',
  partners: ['Анна', 'Дмитрий'],
  score: 72,
  level: 'B',
  constructs: [
    {
      code: 'risk_attitude',
      name: 'Отношение к рискам',
      block: 'Паритет',
      zone: 'red',
      values: [30, 85],
    },
    { code: 'plan_flexibility', name: 'План — гибкость', zone: 'green' },
  ],
};

describe('pespPayloadSchema / parsePespFile', () => {
  it('accepts a valid psa-pesp-v0 report', () => {
    const parsed = parsePespFile(Buffer.from(JSON.stringify(validReport), 'utf8'));
    expect(parsed).not.toBeNull();
    expect(parsed?.score).toBe(72);
    expect(parsed?.constructs).toHaveLength(2);
    expect(parsed?.constructs[0]?.values).toEqual([30, 85]);
  });

  it('returns null for non-JSON and foreign JSON files', () => {
    expect(parsePespFile(Buffer.from('%PDF-1.7 …', 'utf8'))).toBeNull();
    expect(parsePespFile(Buffer.from('{"hello":"world"}', 'utf8'))).toBeNull();
    expect(parsePespFile(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBeNull();
  });

  it('rejects unknown fields, bad zones, and out-of-range values', () => {
    expect(pespPayloadSchema.safeParse({ ...validReport, extra: 1 }).success).toBe(false);
    expect(
      pespPayloadSchema.safeParse({
        ...validReport,
        constructs: [{ code: 'x', name: 'X', zone: 'blue' }],
      }).success,
    ).toBe(false);
    expect(
      pespPayloadSchema.safeParse({
        ...validReport,
        constructs: [{ code: 'x', name: 'X', zone: 'red', values: [150, 20] }],
      }).success,
    ).toBe(false);
    expect(pespPayloadSchema.safeParse({ ...validReport, score: 101 }).success).toBe(false);
  });

  it('requires the format marker and at least one construct', () => {
    expect(pespPayloadSchema.safeParse({ ...validReport, format: 'pesp-v1' }).success).toBe(false);
    expect(pespPayloadSchema.safeParse({ ...validReport, constructs: [] }).success).toBe(false);
  });

  it('updateZonesSchema takes codes with zones and rejects junk', () => {
    expect(
      updateZonesSchema.safeParse({
        constructs: [{ code: 'risk_attitude', zone: 'yellow', name: 'Риски' }],
      }).success,
    ).toBe(true);
    expect(
      updateZonesSchema.safeParse({ constructs: [{ code: 'риски', zone: 'red' }] }).success,
    ).toBe(false);
    expect(
      updateZonesSchema.safeParse({ constructs: [{ code: 'a', zone: 'red', values: [1, 2] }] })
        .success,
    ).toBe(false);
  });
});
