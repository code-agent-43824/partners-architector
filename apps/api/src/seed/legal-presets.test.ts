import { Carrier } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import { DEFAULT_CARRIER_PRESETS } from './legal-presets';

describe('DEFAULT_CARRIER_PRESETS', () => {
  it('references only valid Carrier enum values', () => {
    const valid = new Set<string>(Object.values(Carrier));
    for (const preset of DEFAULT_CARRIER_PRESETS) {
      expect(preset.carriers.length).toBeGreaterThan(0);
      for (const carrier of preset.carriers) {
        expect(valid.has(carrier), `${carrier} is not a Carrier`).toBe(true);
      }
    }
  });

  it('matches the 11 carriers defined in Appendix B', () => {
    expect(Object.values(Carrier)).toHaveLength(11);
  });
});
