import { ClauseStatus } from '@prisma/client';
import { z } from 'zod';

export const updateClauseStatusSchema = z
  .object({
    status: z.nativeEnum(ClauseStatus),
    naReason: z.string().trim().max(2000).optional(),
  })
  .refine(
    (value) =>
      value.status !== ClauseStatus.not_applicable ||
      (value.naReason !== undefined && value.naReason.length > 0),
    {
      message: 'A reason is required to mark a block "not applicable"',
      path: ['naReason'],
    },
  );
export type UpdateClauseStatusDto = z.infer<typeof updateClauseStatusSchema>;
