import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  completeSession,
  type CreateSessionInput,
  createSession,
  deleteSession,
  listSessions,
  startSession,
} from '../api/sessions';

const sessionsKey = (partnershipId: string) => ['sessions', partnershipId];

export function useSessions(partnershipId: string) {
  return useQuery({
    queryKey: sessionsKey(partnershipId),
    queryFn: () => listSessions(partnershipId),
  });
}

function useInvalidateSessions(partnershipId: string) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: sessionsKey(partnershipId) });
  };
}

export function useCreateSession(partnershipId: string) {
  const invalidate = useInvalidateSessions(partnershipId);
  return useMutation({
    mutationFn: (body: CreateSessionInput) => createSession(partnershipId, body),
    onSuccess: invalidate,
  });
}

export function useStartSession(partnershipId: string) {
  const invalidate = useInvalidateSessions(partnershipId);
  return useMutation({
    mutationFn: (sessionId: string) => startSession(partnershipId, sessionId),
    onSuccess: invalidate,
  });
}

export function useCompleteSession(partnershipId: string) {
  const invalidate = useInvalidateSessions(partnershipId);
  return useMutation({
    mutationFn: (sessionId: string) => completeSession(partnershipId, sessionId),
    onSuccess: invalidate,
  });
}

export function useDeleteSession(partnershipId: string) {
  const invalidate = useInvalidateSessions(partnershipId);
  return useMutation({
    mutationFn: (sessionId: string) => deleteSession(partnershipId, sessionId),
    onSuccess: invalidate,
  });
}
