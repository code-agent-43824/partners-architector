import { apiFetch } from './client';

/** Hard upper bound on partners per partnership (kept in sync with the API). */
export const MAX_PARTNERS = 5;
/** Minimum partners a session needs; not enforced while editing (checked at session start). */
export const MIN_PARTNERS = 2;

export interface Partner {
  id: string;
  partnershipId: string;
  fullName: string;
  role: string | null;
  contact: string | null;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerInput {
  fullName?: string;
  role?: string | null;
  contact?: string | null;
}

export function listPartners(partnershipId: string): Promise<Partner[]> {
  return apiFetch<Partner[]>(`/partnerships/${partnershipId}/partners`);
}

export function addPartner(
  partnershipId: string,
  body: PartnerInput & { fullName: string },
): Promise<Partner> {
  return apiFetch<Partner>(`/partnerships/${partnershipId}/partners`, { method: 'POST', body });
}

export function updatePartner(
  partnershipId: string,
  partnerId: string,
  body: PartnerInput,
): Promise<Partner> {
  return apiFetch<Partner>(`/partnerships/${partnershipId}/partners/${partnerId}`, {
    method: 'PATCH',
    body,
  });
}

export function removePartner(partnershipId: string, partnerId: string): Promise<void> {
  return apiFetch<void>(`/partnerships/${partnershipId}/partners/${partnerId}`, {
    method: 'DELETE',
  });
}

export function reorderPartners(partnershipId: string, ids: string[]): Promise<Partner[]> {
  return apiFetch<Partner[]>(`/partnerships/${partnershipId}/partners/reorder`, {
    method: 'POST',
    body: { ids },
  });
}
