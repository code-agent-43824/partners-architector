/** Session JWT cookie (httpOnly). */
export const SESSION_COOKIE = 'psa_session';
/** CSRF token cookie (readable by the SPA for the double-submit pattern). */
export const CSRF_COOKIE = 'psa_csrf';
/** Header the SPA echoes the CSRF token in on mutating requests. */
export const CSRF_HEADER = 'x-csrf-token';

/** Cookie lifetime in milliseconds (kept aligned with AUTH_TOKEN_TTL = 7d). */
export const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
