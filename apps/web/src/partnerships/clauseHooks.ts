import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  listClauses,
  listClauseVersions,
  restoreClauseVersion,
  saveClauseVersion,
  setClauseSignoff,
  updateClause,
  type UpdateClauseInput,
} from '../api/scenario';

const clausesKey = (partnershipId: string, sessionId: string) => [
  'clauses',
  partnershipId,
  sessionId,
];

const versionsKey = (partnershipId: string, sessionId: string, clauseId: string) => [
  'clause-versions',
  partnershipId,
  sessionId,
  clauseId,
];

export function useClauses(partnershipId: string, sessionId: string) {
  return useQuery({
    queryKey: clausesKey(partnershipId, sessionId),
    queryFn: () => listClauses(partnershipId, sessionId),
  });
}

export function useUpdateClause(partnershipId: string, sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { clauseId: string; body: UpdateClauseInput }) =>
      updateClause(partnershipId, sessionId, args.clauseId, args.body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: clausesKey(partnershipId, sessionId) });
    },
  });
}

export function useSetSignoff(partnershipId: string, sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { clauseId: string; partnerId: string; agreed: boolean }) =>
      setClauseSignoff(partnershipId, sessionId, args.clauseId, args.partnerId, args.agreed),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: clausesKey(partnershipId, sessionId) });
    },
  });
}

export function useClauseVersions(
  partnershipId: string,
  sessionId: string,
  clauseId: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: versionsKey(partnershipId, sessionId, clauseId),
    queryFn: () => listClauseVersions(partnershipId, sessionId, clauseId),
    enabled,
  });
}

export function useSaveVersion(partnershipId: string, sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { clauseId: string; note?: string }) =>
      saveClauseVersion(partnershipId, sessionId, args.clauseId, args.note),
    onSuccess: (_data, args) => {
      void qc.invalidateQueries({ queryKey: versionsKey(partnershipId, sessionId, args.clauseId) });
    },
  });
}

export function useRestoreVersion(partnershipId: string, sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { clauseId: string; versionId: string }) =>
      restoreClauseVersion(partnershipId, sessionId, args.clauseId, args.versionId),
    onSuccess: (_data, args) => {
      void qc.invalidateQueries({ queryKey: clausesKey(partnershipId, sessionId) });
      void qc.invalidateQueries({ queryKey: versionsKey(partnershipId, sessionId, args.clauseId) });
    },
  });
}
