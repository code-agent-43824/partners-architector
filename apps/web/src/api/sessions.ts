import { apiFetch } from './client';

export type SessionKind = 'initial' | 'review';
export type SessionStatus = 'draft' | 'in_progress' | 'completed';

export interface Session {
  id: string;
  partnershipId: string;
  kind: SessionKind;
  title: string | null;
  status: SessionStatus;
  baselineSessionId: string | null;
  startedAt: string | null;
  completedAt: string | null;
  nextReviewAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSessionInput {
  kind: SessionKind;
  title?: string;
  baselineSessionId?: string;
}

export function listSessions(partnershipId: string): Promise<Session[]> {
  return apiFetch<Session[]>(`/partnerships/${partnershipId}/sessions`);
}

export function createSession(partnershipId: string, body: CreateSessionInput): Promise<Session> {
  return apiFetch<Session>(`/partnerships/${partnershipId}/sessions`, { method: 'POST', body });
}

export function startSession(partnershipId: string, sessionId: string): Promise<Session> {
  return apiFetch<Session>(`/partnerships/${partnershipId}/sessions/${sessionId}/start`, {
    method: 'POST',
  });
}

export function completeSession(partnershipId: string, sessionId: string): Promise<Session> {
  return apiFetch<Session>(`/partnerships/${partnershipId}/sessions/${sessionId}/complete`, {
    method: 'POST',
  });
}

export function deleteSession(partnershipId: string, sessionId: string): Promise<void> {
  return apiFetch<void>(`/partnerships/${partnershipId}/sessions/${sessionId}`, {
    method: 'DELETE',
  });
}
