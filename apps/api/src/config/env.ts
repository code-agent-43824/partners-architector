import { z } from 'zod';

/**
 * Environment contract for the API. Validated once at boot via
 * ConfigModule's `validate` hook so misconfiguration fails fast and loudly.
 * Auth follows spec SEC-1 (email/password, JWT, CSRF, rate limiting) and is
 * kept extensible for MFA/FIDO2 (SEC-2).
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),

  // Secret used to sign session JWTs (set a long random value).
  AUTH_JWT_SECRET: z.string().min(16, 'AUTH_JWT_SECRET must be at least 16 characters'),
  // JWT / session cookie lifetime (vercel/ms format, e.g. "7d", "12h").
  AUTH_TOKEN_TTL: z.string().default('7d'),
  // Send cookies only over HTTPS (enable in production behind the TLS proxy).
  AUTH_COOKIE_SECURE: z
    .string()
    .optional()
    .transform((value) => value === 'true' || value === '1'),

  // Optional initial admin, created on first boot if no admin exists.
  AUTH_ADMIN_EMAIL: z.string().email().optional(),
  AUTH_ADMIN_PASSWORD: z.string().min(8).optional(),
});

export type Env = z.infer<typeof envSchema>;

/** Parse and validate raw environment variables, throwing a readable error. */
export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}
