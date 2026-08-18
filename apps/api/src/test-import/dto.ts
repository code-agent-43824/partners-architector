import { z } from 'zod';

/**
 * D9 — compatibility-test result imports (ПЕСП). The official export format
 * of the ПЕСП mini-app is not known yet, so uploads accept ANY file (the raw
 * bytes are retained for later re-parsing) and only our own provisional JSON
 * format `psa-pesp-v0` is recognized immediately. The provisional format is
 * documented in docs/plans/pesp-compatibility-import.md.
 */

/** Upload cap for a single test-report file. */
export const MAX_TEST_IMPORT_BYTES = 10 * 1024 * 1024;

export const PESP_FORMAT_V0 = 'psa-pesp-v0';

export const zoneSchema = z.enum(['green', 'yellow', 'red']);
export type Zone = z.infer<typeof zoneSchema>;

const constructCodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9_.-]+$/i, 'construct code must be alphanumeric with _ . -');

const pespConstructSchema = z
  .object({
    code: constructCodeSchema,
    name: z.string().trim().min(1).max(200),
    block: z.string().trim().min(1).max(60).optional(),
    zone: zoneSchema,
    // One 0–100 score per partner, in the order of `partners` (2–5, matching
    // the partnership size bounds).
    values: z.array(z.number().min(0).max(100)).min(2).max(5).optional(),
  })
  .strict();

export const pespPayloadSchema = z
  .object({
    format: z.literal(PESP_FORMAT_V0),
    partners: z.array(z.string().trim().min(1).max(200)).min(2).max(5).optional(),
    score: z.number().min(0).max(100).optional(),
    level: z.enum(['A', 'B', 'C', 'D']).optional(),
    constructs: z.array(pespConstructSchema).min(1).max(64),
  })
  .strict();

export type PespPayload = z.infer<typeof pespPayloadSchema>;
export type PespConstruct = z.infer<typeof pespConstructSchema>;

/**
 * Shape stored in `test_import.payload` (and returned to the web app): the
 * validated report fields plus where the zones came from. Never contains
 * anything from the file that did not pass the schema.
 */
export interface TestImportPayload {
  source: 'file' | 'manual' | 'file+manual';
  partners?: string[];
  score?: number;
  level?: 'A' | 'B' | 'C' | 'D';
  constructs: PespConstruct[];
}

/**
 * Manual zone marking (PATCH …/zones): the client sends the complete
 * effective set of marked constructs; omitted constructs become unmarked.
 * `values` are preserved server-side for codes the parsed file already had.
 */
export const updateZonesSchema = z
  .object({
    constructs: z
      .array(
        z
          .object({
            code: constructCodeSchema,
            name: z.string().trim().min(1).max(200).optional(),
            zone: zoneSchema,
          })
          .strict(),
      )
      .max(64),
  })
  .strict();

export type UpdateZonesDto = z.infer<typeof updateZonesSchema>;

/** Parses an uploaded file as provisional ПЕСП JSON; null for any other file. */
export function parsePespFile(data: Buffer): PespPayload | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(data.toString('utf8'));
  } catch {
    return null;
  }
  const result = pespPayloadSchema.safeParse(parsed);
  return result.success ? result.data : null;
}
