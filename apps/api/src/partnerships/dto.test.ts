import { describe, expect, it } from 'vitest';

import {
  createPartnershipSchema,
  listPartnershipsQuerySchema,
  updatePartnershipSchema,
} from './dto';

describe('partnership DTOs', () => {
  it('create requires a non-empty name and accepts valid tags', () => {
    expect(createPartnershipSchema.safeParse({ name: '' }).success).toBe(false);
    expect(
      createPartnershipSchema.safeParse({ name: 'Acme', typeTags: ['new'], notes: 'x' }).success,
    ).toBe(true);
  });

  it('create rejects an unknown tag', () => {
    expect(createPartnershipSchema.safeParse({ name: 'Acme', typeTags: ['nope'] }).success).toBe(
      false,
    );
  });

  it('update requires at least one field', () => {
    expect(updatePartnershipSchema.safeParse({}).success).toBe(false);
    expect(updatePartnershipSchema.safeParse({ name: 'New name' }).success).toBe(true);
  });

  it('list query defaults status to active', () => {
    expect(listPartnershipsQuerySchema.parse({}).status).toBe('active');
    expect(listPartnershipsQuerySchema.safeParse({ status: 'nope' }).success).toBe(false);
  });
});
