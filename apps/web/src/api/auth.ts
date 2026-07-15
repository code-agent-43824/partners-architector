import { apiFetch } from './client';

export type Role = 'admin' | 'architect' | 'client';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  displayName: string | null;
  /** Guided onboarding interstitials (D7): per-user toggle. */
  guidedMode: boolean;
}

export function login(email: string, password: string): Promise<AuthUser> {
  return apiFetch<AuthUser>('/auth/login', { method: 'POST', body: { email, password } });
}

export function logout(): Promise<void> {
  return apiFetch<void>('/auth/logout', { method: 'POST' });
}

export function fetchMe(): Promise<AuthUser> {
  return apiFetch<AuthUser>('/auth/me');
}

export function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  return apiFetch<void>('/auth/change-password', {
    method: 'POST',
    body: { currentPassword, newPassword },
  });
}

export function updatePreferences(guidedMode: boolean): Promise<AuthUser> {
  return apiFetch<AuthUser>('/auth/preferences', { method: 'PATCH', body: { guidedMode } });
}
