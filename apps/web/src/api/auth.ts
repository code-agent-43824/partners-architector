import { apiFetch } from './client';

export type Role = 'admin' | 'architect' | 'client';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  displayName: string | null;
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
