import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { listClauses, updateClause, type UpdateClauseInput } from '../api/scenario';

const clausesKey = (partnershipId: string, sessionId: string) => [
  'clauses',
  partnershipId,
  sessionId,
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
