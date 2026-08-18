import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '../api/client';
import type { TestImport, Zone } from '../compat/constructs';

const importsKey = (partnershipId: string) => ['test-imports', partnershipId];

export function useTestImports(partnershipId: string) {
  return useQuery({
    queryKey: importsKey(partnershipId),
    queryFn: () => apiFetch<TestImport[]>(`/partnerships/${partnershipId}/test-imports`),
  });
}

function useInvalidateImports(partnershipId: string) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: importsKey(partnershipId) });
  };
}

export function useUploadTestImport(partnershipId: string) {
  const invalidate = useInvalidateImports(partnershipId);
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('file', file, file.name);
      return apiFetch<TestImport>(`/partnerships/${partnershipId}/test-imports`, {
        method: 'POST',
        body: form,
      });
    },
    onSuccess: invalidate,
  });
}

export interface ZoneMark {
  code: string;
  name?: string;
  zone: Zone;
}

export function useUpdateZones(partnershipId: string) {
  const invalidate = useInvalidateImports(partnershipId);
  return useMutation({
    mutationFn: (args: { importId: string; constructs: ZoneMark[] }) =>
      apiFetch<TestImport>(`/partnerships/${partnershipId}/test-imports/${args.importId}/zones`, {
        method: 'PATCH',
        body: { constructs: args.constructs },
      }),
    onSuccess: invalidate,
  });
}

export function useDeleteTestImport(partnershipId: string) {
  const invalidate = useInvalidateImports(partnershipId);
  return useMutation({
    mutationFn: (importId: string) =>
      apiFetch<void>(`/partnerships/${partnershipId}/test-imports/${importId}`, {
        method: 'DELETE',
      }),
    onSuccess: invalidate,
  });
}
