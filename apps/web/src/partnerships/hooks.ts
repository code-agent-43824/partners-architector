import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  archivePartnership,
  createPartnership,
  deletePartnership,
  getPartnership,
  type ListParams,
  listPartnerships,
  type PartnershipInput,
  restorePartnership,
  updatePartnership,
} from '../api/partnerships';

const LIST_KEY = ['partnerships'];
const itemKey = (id: string) => ['partnership', id];

export function usePartnerships(params: ListParams) {
  return useQuery({ queryKey: [...LIST_KEY, params], queryFn: () => listPartnerships(params) });
}

export function usePartnership(id: string) {
  return useQuery({ queryKey: itemKey(id), queryFn: () => getPartnership(id) });
}

export function useCreatePartnership() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createPartnership,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export function useUpdatePartnership(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PartnershipInput) => updatePartnership(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: itemKey(id) });
      void qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

function useStatusMutation(id: string, fn: (id: string) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => fn(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: itemKey(id) });
      void qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export const useArchivePartnership = (id: string) => useStatusMutation(id, archivePartnership);
export const useRestorePartnership = (id: string) => useStatusMutation(id, restorePartnership);

export function useDeletePartnership(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => deletePartnership(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}
