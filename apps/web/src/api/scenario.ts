import { apiFetch } from './client';

export type ClauseStatus =
  | 'not_started'
  | 'in_progress'
  | 'parked'
  | 'agreed'
  | 'disputed'
  | 'not_applicable';

export interface ClauseQuestion {
  number: number;
  title: string;
  prompt: string | null;
  helperQuestions: string[];
  category: string;
  isSensitive: boolean;
  orderIndex: number;
}

export interface ClauseSignoff {
  id: string;
  clauseId: string;
  partnerId: string;
  agreed: boolean;
  signedAt: string | null;
}

/** Manual final shares of the доли block (№5), stored in `structured_data`. */
export interface ShareAllocation {
  partnerId: string;
  percent: number;
}

export interface SharesData {
  mode: 'manual';
  allocations: ShareAllocation[];
}

/** «Смысл долей» flags of block №6 (FR-5.8). */
export interface MeaningData {
  voting: boolean;
  profit: boolean;
  ownership: boolean;
  losses: boolean;
}

export interface StructuredData {
  shares?: SharesData;
  meaning?: MeaningData;
}

export interface Clause {
  id: string;
  sessionId: string;
  questionId: string;
  status: ClauseStatus;
  text: string | null;
  rationale: string | null;
  naReason: string | null;
  source: string;
  structuredData: StructuredData | null;
  createdAt: string;
  updatedAt: string;
  question: ClauseQuestion;
  signoffs: ClauseSignoff[];
}

export interface ClauseVersion {
  id: string;
  clauseId: string;
  text: string | null;
  rationale: string | null;
  status: ClauseStatus;
  note: string | null;
  editedAt: string;
}

export interface UpdateClauseInput {
  status?: ClauseStatus;
  naReason?: string;
  text?: string | null;
  rationale?: string | null;
  structuredData?: StructuredData;
}

export function listClauses(partnershipId: string, sessionId: string): Promise<Clause[]> {
  return apiFetch<Clause[]>(`/partnerships/${partnershipId}/sessions/${sessionId}/clauses`);
}

export function updateClause(
  partnershipId: string,
  sessionId: string,
  clauseId: string,
  body: UpdateClauseInput,
): Promise<Clause> {
  return apiFetch<Clause>(
    `/partnerships/${partnershipId}/sessions/${sessionId}/clauses/${clauseId}`,
    { method: 'PATCH', body },
  );
}

export function setClauseSignoff(
  partnershipId: string,
  sessionId: string,
  clauseId: string,
  partnerId: string,
  agreed: boolean,
): Promise<ClauseSignoff> {
  return apiFetch<ClauseSignoff>(
    `/partnerships/${partnershipId}/sessions/${sessionId}/clauses/${clauseId}/signoffs/${partnerId}`,
    { method: 'PUT', body: { agreed } },
  );
}

export function listClauseVersions(
  partnershipId: string,
  sessionId: string,
  clauseId: string,
): Promise<ClauseVersion[]> {
  return apiFetch<ClauseVersion[]>(
    `/partnerships/${partnershipId}/sessions/${sessionId}/clauses/${clauseId}/versions`,
  );
}

export function saveClauseVersion(
  partnershipId: string,
  sessionId: string,
  clauseId: string,
  note?: string,
): Promise<ClauseVersion> {
  return apiFetch<ClauseVersion>(
    `/partnerships/${partnershipId}/sessions/${sessionId}/clauses/${clauseId}/versions`,
    { method: 'POST', body: { note } },
  );
}

export function restoreClauseVersion(
  partnershipId: string,
  sessionId: string,
  clauseId: string,
  versionId: string,
): Promise<Clause> {
  return apiFetch<Clause>(
    `/partnerships/${partnershipId}/sessions/${sessionId}/clauses/${clauseId}/versions/${versionId}/restore`,
    { method: 'POST' },
  );
}
