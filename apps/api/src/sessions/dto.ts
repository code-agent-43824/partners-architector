import { SessionKind } from '@prisma/client';
import { z } from 'zod';

export const createSessionSchema = z
  .object({
    kind: z.nativeEnum(SessionKind),
    title: z.string().trim().max(200).optional(),
    baselineSessionId: z.string().uuid().optional(),
  })
  .refine((value) => value.kind !== SessionKind.review || value.baselineSessionId !== undefined, {
    message: 'A review session requires a baseline session',
    path: ['baselineSessionId'],
  })
  .refine((value) => value.kind !== SessionKind.initial || value.baselineSessionId === undefined, {
    message: 'An initial session cannot reference a baseline session',
    path: ['baselineSessionId'],
  });
export type CreateSessionDto = z.infer<typeof createSessionSchema>;
