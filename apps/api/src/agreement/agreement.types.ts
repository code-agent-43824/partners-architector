import type { ClauseStatus, SessionKind, SessionStatus } from '@prisma/client';

import type { Principle } from '../seed/principles';

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
  /** Formulation, TipTap HTML (sanitized on render by the web). */
  text: string | null;
  rationale: string | null;
  naReason: string | null;
  signoffs: AgreementSignoff[];
  /** Present only on the shares block (№5). */
  shares: AgreementShares | null;
  /** Present only on the meaning-of-shares block (№6). */
  meaning: AgreementMeaning | null;
}

export interface AgreementSummary {
  total: number;
  applicable: number;
  agreed: number;
  fullyConfirmed: number;
}

/** The fully assembled partnership agreement (DOC-1, minus the authority matrix). */
export interface AgreementDocument {
  partnershipName: string;
  participants: AgreementParticipant[];
  sessionTitle: string | null;
  sessionKind: SessionKind;
  sessionStatus: SessionStatus;
  assembledAt: string;
  summary: AgreementSummary;
  principles: Principle[];
  sections: AgreementSection[];
}
