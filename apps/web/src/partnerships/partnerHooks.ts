import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  addPartner,
  listPartners,
  type PartnerInput,
  removePartner,
  reorderPartners,
  updatePartner,
} from '../api/partners';

const partnersKey = (partnershipId: string) => ['partners', partnershipId];

export function usePartners(partnershipId: string) {
  return useQuery({
    queryKey: partnersKey(partnershipId),
    queryFn: () => listPartners(partnershipId),
  });
}

function useInvalidatePartners(partnershipId: string) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: partnersKey(partnershipId) });
  };
}

export function useAddPartner(partnershipId: string) {
  const invalidate = useInvalidatePartners(partnershipId);
  return useMutation({
    mutationFn: (body: PartnerInput & { fullName: string }) => addPartner(partnershipId, body),
    onSuccess: invalidate,
  });
}

export function useUpdatePartner(partnershipId: string) {
  const invalidate = useInvalidatePartners(partnershipId);
  return useMutation({
    mutationFn: (args: { partnerId: string; body: PartnerInput }) =>
      updatePartner(partnershipId, args.partnerId, args.body),
    onSuccess: invalidate,
  });
}

export function useRemovePartner(partnershipId: string) {
  const invalidate = useInvalidatePartners(partnershipId);
  return useMutation({
    mutationFn: (partnerId: string) => removePartner(partnershipId, partnerId),
    onSuccess: invalidate,
  });
}

export function useReorderPartners(partnershipId: string) {
  const invalidate = useInvalidatePartners(partnershipId);
  return useMutation({
    mutationFn: (ids: string[]) => reorderPartners(partnershipId, ids),
    onSuccess: invalidate,
  });
}
