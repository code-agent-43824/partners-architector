import { apiFetch } from './client';

export type PartnershipStatus = 'active' | 'archived';
export type PartnershipTag =
  | 'new'
  | 'existing'
  | 'with_investor'
  | 'employee_options'
  | 'collaboration'
  | 'other';

export interface Partnership {
  id: string;
  name: string;
  typeTags: PartnershipTag[];
  status: PartnershipStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListParams {
  search?: string;
  status?: 'active' | 'archived' | 'all';
}

export interface PartnershipInput {
  name?: string;
  typeTags?: PartnershipTag[];
  notes?: string | null;
}

export function listPartnerships(params: ListParams = {}): Promise<Partnership[]> {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.status) qs.set('status', params.status);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiFetch<Partnership[]>(`/partnerships${suffix}`);
}

export function createPartnership(body: PartnershipInput & { name: string }): Promise<Partnership> {
  return apiFetch<Partnership>('/partnerships', { method: 'POST', body });
}

export function getPartnership(id: string): Promise<Partnership> {
  return apiFetch<Partnership>(`/partnerships/${id}`);
}

export function updatePartnership(id: string, body: PartnershipInput): Promise<Partnership> {
  return apiFetch<Partnership>(`/partnerships/${id}`, { method: 'PATCH', body });
}

export function archivePartnership(id: string): Promise<Partnership> {
  return apiFetch<Partnership>(`/partnerships/${id}/archive`, { method: 'POST' });
}

export function restorePartnership(id: string): Promise<Partnership> {
  return apiFetch<Partnership>(`/partnerships/${id}/restore`, { method: 'POST' });
}

export function deletePartnership(id: string): Promise<void> {
  return apiFetch<void>(`/partnerships/${id}`, { method: 'DELETE' });
}
