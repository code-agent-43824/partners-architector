import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import {
  type Clause,
  type ClauseSignoff,
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

/**
 * Merge a mutation's clause result into the cached list without refetching all
 * 30. The API returns the full clause shape (question + signoffs), but we merge
 * rather than replace so a response that ever omits a relation can't blank the
 * scenario screen (`clause.question` must always be present to render).
 */
function replaceClause(
  qc: ReturnType<typeof useQueryClient>,
  partnershipId: string,
  sessionId: string,
  updated: Clause,
) {
  qc.setQueryData<Clause[]>(clausesKey(partnershipId, sessionId), (old) =>
    old ? old.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)) : old,
  );
}

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
    // FR-4.1: autosave writes the PATCH result straight into the cache so a
    // single-block save never refetches the whole 30-clause list.
    onSuccess: (updated) => {
      replaceClause(qc, partnershipId, sessionId, updated);
    },
  });
}

/**
 * Persist a formulation edit immediately and write the result into the cache.
 * Used to flush a pending autosave when the focused block unmounts (a
 * mid-edit block switch must never drop text); bypasses the mutation observer
 * so it still completes after the owning component has gone.
 */
export function useFlushClause(partnershipId: string, sessionId: string) {
  const qc = useQueryClient();
  return useCallback(
    (clauseId: string, body: UpdateClauseInput) => {
      updateClause(partnershipId, sessionId, clauseId, body)
        .then((updated) => replaceClause(qc, partnershipId, sessionId, updated))
        .catch(() => {
          /* offline / server unreachable — the debounced autosave already
             surfaces the failure; nothing to update in the cache. */
        });
    },
    [qc, partnershipId, sessionId],
  );
}

export function useSetSignoff(partnershipId: string, sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { clauseId: string; partnerId: string; agreed: boolean }) =>
      setClauseSignoff(partnershipId, sessionId, args.clauseId, args.partnerId, args.agreed),
    // The endpoint returns the single sign-off; merge it into its clause's list.
    onSuccess: (signoff: ClauseSignoff, args) => {
      qc.setQueryData<Clause[]>(clausesKey(partnershipId, sessionId), (old) =>
        old
          ? old.map((c) => {
              if (c.id !== args.clauseId) {
                return c;
              }
              const others = c.signoffs.filter((s) => s.partnerId !== signoff.partnerId);
              return { ...c, signoffs: [...others, signoff] };
            })
          : old,
      );
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
    onSuccess: (updated, args) => {
      replaceClause(qc, partnershipId, sessionId, updated);
      void qc.invalidateQueries({ queryKey: versionsKey(partnershipId, sessionId, args.clauseId) });
    },
  });
}
