import { PartnershipTag } from '@prisma/client';
import { z } from 'zod';

export const createPartnershipSchema = z.object({
  name: z.string().trim().min(1).max(200),
  typeTags: z.array(z.nativeEnum(PartnershipTag)).max(10).optional(),
  notes: z.string().max(10_000).optional(),
});
export type CreatePartnershipDto = z.infer<typeof createPartnershipSchema>;

export const updatePartnershipSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    typeTags: z.array(z.nativeEnum(PartnershipTag)).max(10).optional(),
    notes: z.string().max(10_000).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'No fields to update' });
export type UpdatePartnershipDto = z.infer<typeof updatePartnershipSchema>;

export const listPartnershipsQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  status: z.enum(['active', 'archived', 'all']).default('active'),
});
export type ListPartnershipsQueryDto = z.infer<typeof listPartnershipsQuerySchema>;
