import { apiFetch } from './client';
import type { ClauseStatus } from './scenario';

export interface AgreementParticipant {
  fullName: string;
  role: string | null;
}

export interface AgreementSignoff {
  partnerName: string;
  agreed: boolean;
}

export interface AgreementShares {
  allocations: { partnerName: string; percent: number }[];
  total: number;
}

export interface AgreementMeaning {
  voting: boolean;
  profit: boolean;
  ownership: boolean;
  losses: boolean;
}

export interface AgreementSection {
  number: number;
  title: string;
  category: string;
  isSensitive: boolean;
  status: ClauseStatus;
  text: string | null;
  rationale: string | null;
  naReason: string | null;
  signoffs: AgreementSignoff[];
  shares: AgreementShares | null;
  meaning: AgreementMeaning | null;
}

export interface AgreementPrinciple {
  title: string;
  body: string;
}

export interface AgreementSummary {
  total: number;
  applicable: number;
  agreed: number;
  fullyConfirmed: number;
}

export interface AgreementDocument {
  partnershipName: string;
  participants: AgreementParticipant[];
  sessionTitle: string | null;
  sessionKind: 'initial' | 'review';
  sessionStatus: 'draft' | 'in_progress' | 'completed';
  assembledAt: string;
  summary: AgreementSummary;
  principles: AgreementPrinciple[];
  sections: AgreementSection[];
}

export function getAgreement(partnershipId: string, sessionId: string): Promise<AgreementDocument> {
  return apiFetch<AgreementDocument>(
    `/partnerships/${partnershipId}/sessions/${sessionId}/agreement`,
  );
}
