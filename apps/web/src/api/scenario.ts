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

export interface Clause {
  id: string;
  sessionId: string;
  questionId: string;
  status: ClauseStatus;
  text: string | null;
  rationale: string | null;
  naReason: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
  question: ClauseQuestion;
}

export interface UpdateClauseInput {
  status?: ClauseStatus;
  naReason?: string;
  text?: string | null;
  rationale?: string | null;
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
