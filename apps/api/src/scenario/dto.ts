import { ClauseStatus } from '@prisma/client';
import { z } from 'zod';

/**
 * Structured payload of the shares blocks (spec §4.5). Stored in
 * `clause.structured_data`:
 * - block №5 keeps the final shares (FR-5.7, manual mode of FR-5.1 for now);
 * - block №6 keeps the "meaning of shares" flags (FR-5.8).
 * The sum-to-100 rule is a live check in the UI, not enforced here — an
 * in-progress session may hold an intermediate total, and autosave must not
 * be blocked. The strict shape keeps the JSON we persist and later render
 * (D3 agreement) predictable.
 */
const shareAllocationSchema = z.object({
  partnerId: z.string().uuid(),
  percent: z.number().min(0).max(100),
});

const sharesSchema = z.object({
  mode: z.literal('manual'),
  allocations: z.array(shareAllocationSchema).max(10),
});

const meaningSchema = z.object({
  voting: z.boolean(),
  profit: z.boolean(),
  ownership: z.boolean(),
  losses: z.boolean(),
});

export const structuredDataSchema = z
  .object({
    shares: sharesSchema.optional(),
    meaning: meaningSchema.optional(),
  })
  .strict();
export type StructuredData = z.infer<typeof structuredDataSchema>;

export const updateClauseSchema = z
  .object({
    status: z.nativeEnum(ClauseStatus).optional(),
    naReason: z.string().trim().max(2000).optional(),
    text: z.string().max(50_000).nullable().optional(),
    rationale: z.string().max(10_000).nullable().optional(),
    structuredData: structuredDataSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'No fields to update' })
  .refine(
    (value) =>
      value.status !== ClauseStatus.not_applicable ||
      (value.naReason !== undefined && value.naReason.length > 0),
    {
      message: 'A reason is required to mark a block "not applicable"',
      path: ['naReason'],
    },
  );
export type UpdateClauseDto = z.infer<typeof updateClauseSchema>;

export const setSignoffSchema = z.object({ agreed: z.boolean() });
export type SetSignoffDto = z.infer<typeof setSignoffSchema>;

export const saveVersionSchema = z.object({ note: z.string().trim().max(1000).optional() });
export type SaveVersionDto = z.infer<typeof saveVersionSchema>;
