import { z } from 'zod';

/** Hard upper bound on partners per partnership (owner decision 2026-06-24). */
export const MAX_PARTNERS = 5;

export const createPartnerSchema = z.object({
  fullName: z.string().trim().min(1).max(200),
  role: z.string().trim().max(200).optional(),
  contact: z.string().trim().max(200).optional(),
});
export type CreatePartnerDto = z.infer<typeof createPartnerSchema>;

export const updatePartnerSchema = z
  .object({
    fullName: z.string().trim().min(1).max(200).optional(),
    role: z.string().trim().max(200).nullable().optional(),
    contact: z.string().trim().max(200).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'No fields to update' });
export type UpdatePartnerDto = z.infer<typeof updatePartnerSchema>;

export const reorderPartnersSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(MAX_PARTNERS),
});
export type ReorderPartnersDto = z.infer<typeof reorderPartnersSchema>;
