import { Injectable, NotFoundException } from '@nestjs/common';
import { ClauseStatus } from '@prisma/client';

import type { AuthUser } from '../auth/auth.types';
import { assertCanAccessOwned } from '../common/ownership';
import { PrismaService } from '../prisma/prisma.service';
import { PRINCIPLES } from '../seed/principles';
import type {
  AgreementDocument,
  AgreementMeaning,
  AgreementSection,
  AgreementShares,
} from './agreement.types';

/** Methodology blocks that carry structured data (spec §4.5). */
const SHARES_BLOCK = 5;
const MEANING_BLOCK = 6;

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Read the final shares (block №5 `structured_data`) into display rows. */
function readShares(data: unknown, nameOf: Map<string, string>): AgreementShares | null {
  const shares = asObject(asObject(data)?.shares);
  const raw = shares?.allocations;
  if (!Array.isArray(raw)) {
    return null;
  }
  const allocations = raw.flatMap((entry) => {
    const rec = asObject(entry);
    const partnerId = typeof rec?.partnerId === 'string' ? rec.partnerId : null;
    if (!partnerId) {
      return [];
    }
    const percent = typeof rec?.percent === 'number' ? rec.percent : 0;
    return [{ partnerName: nameOf.get(partnerId) ?? '—', percent }];
  });
  if (allocations.length === 0) {
    return null;
  }
  return { allocations, total: allocations.reduce((sum, a) => sum + a.percent, 0) };
}

/** Read the meaning-of-shares flags (block №6 `structured_data`). */
function readMeaning(data: unknown): AgreementMeaning | null {
  const meaning = asObject(asObject(data)?.meaning);
  if (!meaning) {
    return null;
  }
  return {
    voting: meaning.voting === true,
    profit: meaning.profit === true,
    ownership: meaning.ownership === true,
    losses: meaning.losses === true,
  };
}

/**
 * Assembles the partnership agreement (DOC-1, minus the authority matrix) from
 * a session's clauses. Server-owned so the same document can later be exported
 * to PDF/DOCX server-side (D4). Scoped through the partnership owner (SEC-5).
 */
@Injectable()
export class AgreementService {
  constructor(private readonly prisma: PrismaService) {}

  async assemble(
    user: AuthUser,
    partnershipId: string,
    sessionId: string,
  ): Promise<AgreementDocument> {
    const partnership = await this.prisma.partnership.findUnique({
      where: { id: partnershipId },
      select: { name: true, ownerAccountId: true },
    });
    if (!partnership) {
      throw new NotFoundException('Partnership not found');
    }
    assertCanAccessOwned(user, partnership.ownerAccountId);

    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { partnershipId: true, title: true, kind: true, status: true },
    });
    if (!session || session.partnershipId !== partnershipId) {
      throw new NotFoundException('Session not found');
    }

    const partners = await this.prisma.partner.findMany({
      where: { partnershipId },
      orderBy: { orderIndex: 'asc' },
      select: { id: true, fullName: true, role: true },
    });
    const clauses = await this.prisma.clause.findMany({
      where: { sessionId },
      orderBy: { question: { orderIndex: 'asc' } },
      include: {
        question: {
          select: { number: true, title: true, category: true, isSensitive: true },
        },
        signoffs: true,
      },
    });

    const nameOf = new Map(partners.map((p) => [p.id, p.fullName]));

    const sections: AgreementSection[] = clauses.map((clause) => {
      const agreedByPartner = new Map(clause.signoffs.map((s) => [s.partnerId, s.agreed]));
      return {
        number: clause.question.number,
        title: clause.question.title,
        category: clause.question.category,
        isSensitive: clause.question.isSensitive,
        status: clause.status,
        text: clause.text,
        rationale: clause.rationale,
        naReason: clause.naReason,
        signoffs: partners.map((p) => ({
          partnerName: p.fullName,
          agreed: agreedByPartner.get(p.id) ?? false,
        })),
        shares:
          clause.question.number === SHARES_BLOCK
            ? readShares(clause.structuredData, nameOf)
            : null,
        meaning:
          clause.question.number === MEANING_BLOCK ? readMeaning(clause.structuredData) : null,
      };
    });

    const applicable = sections.filter((s) => s.status !== ClauseStatus.not_applicable);
    const fullyConfirmed = applicable.filter(
      (s) => s.signoffs.length > 0 && s.signoffs.every((x) => x.agreed),
    ).length;

    return {
      partnershipName: partnership.name,
      participants: partners.map((p) => ({ fullName: p.fullName, role: p.role })),
      sessionTitle: session.title,
      sessionKind: session.kind,
      sessionStatus: session.status,
      assembledAt: new Date().toISOString(),
      summary: {
        total: sections.length,
        applicable: applicable.length,
        agreed: sections.filter((s) => s.status === ClauseStatus.agreed).length,
        fullyConfirmed,
      },
      principles: PRINCIPLES,
      sections,
    };
  }
}
