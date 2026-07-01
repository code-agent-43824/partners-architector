import { ClauseStatus } from '@prisma/client';
import { z } from 'zod';

export const updateClauseSchema = z
  .object({
    status: z.nativeEnum(ClauseStatus).optional(),
    naReason: z.string().trim().max(2000).optional(),
    text: z.string().max(50_000).nullable().optional(),
    rationale: z.string().max(10_000).nullable().optional(),
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
