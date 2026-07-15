import type { Role } from '@prisma/client';

/** The authenticated principal attached to each request by the JWT guard. */
export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  displayName: string | null;
  /** Guided onboarding interstitials (D7): per-user toggle. */
  guidedMode: boolean;
}

/** Claims carried in the session JWT. */
export interface JwtPayload {
  sub: string;
  role: Role;
}
