import { useQuery } from '@tanstack/react-query';

import { getAgreement } from '../api/agreement';

export function useAgreement(partnershipId: string, sessionId: string) {
  return useQuery({
    queryKey: ['agreement', partnershipId, sessionId],
    queryFn: () => getAgreement(partnershipId, sessionId),
  });
}
