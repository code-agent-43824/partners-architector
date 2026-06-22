/**
 * Shared primitives for the Partner Session Assistant (psa).
 *
 * Intentionally small in Phase 0. Domain enums and DTOs (legal carriers,
 * clause statuses, matrix levels, …) are added alongside the Prisma schema
 * in step 0.4 and the feature phases — see docs/spec/psa-mvp.md.
 */

/** The three product roles (spec §3). */
export const USER_ROLES = ['admin', 'architect', 'client'] as const;

/** A product role: platform admin, partnership architect, or client. */
export type UserRole = (typeof USER_ROLES)[number];

/** Runtime type guard for {@link UserRole}. */
export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && (USER_ROLES as readonly string[]).includes(value);
}
