import { describe, expect, it } from 'vitest';

import { createPartnerSchema, reorderPartnersSchema, updatePartnerSchema } from './dto';

describe('partner DTOs', () => {
  it('create requires a non-empty fullName', () => {
    expect(createPartnerSchema.safeParse({ fullName: '' }).success).toBe(false);
    expect(createPartnerSchema.safeParse({ role: 'CEO' }).success).toBe(false);
    expect(
      createPartnerSchema.safeParse({ fullName: 'Иван', role: 'CEO', contact: 'x@y.io' }).success,
    ).toBe(true);
  });

  it('update requires at least one field and allows clearing role/contact', () => {
    expect(updatePartnerSchema.safeParse({}).success).toBe(false);
    expect(updatePartnerSchema.safeParse({ fullName: 'Новое имя' }).success).toBe(true);
    expect(updatePartnerSchema.safeParse({ role: null, contact: null }).success).toBe(true);
  });

  it('reorder requires a non-empty list of uuids within the cap', () => {
    const uuid = '11111111-1111-4111-8111-111111111111';
    expect(reorderPartnersSchema.safeParse({ ids: [] }).success).toBe(false);
    expect(reorderPartnersSchema.safeParse({ ids: ['not-a-uuid'] }).success).toBe(false);
    expect(reorderPartnersSchema.safeParse({ ids: [uuid] }).success).toBe(true);
  });
});
