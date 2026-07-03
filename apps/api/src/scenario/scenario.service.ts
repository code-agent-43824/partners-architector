import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  type Clause,
  type ClauseSignoff,
  ClauseStatus,
  type ClauseVersion,
  type Prisma,
} from '@prisma/client';

import type { AuthUser } from '../auth/auth.types';
import { assertCanAccessOwned } from '../common/ownership';
import { PrismaService } from '../prisma/prisma.service';
import type { SaveVersionDto, SetSignoffDto, UpdateClauseDto } from './dto';

/** Question fields surfaced alongside a clause for the scenario walk (FR-3.3). */
const questionSelect = {
  number: true,
  title: true,
  prompt: true,
  helperQuestions: true,
  category: true,
  isSensitive: true,
  orderIndex: true,
} as const;

/**
 * The relations the web needs on every clause it renders. Reads *and* writes
 * return this shape so the client can trust a mutation response as a drop-in
 * cache replacement (it renders `clause.question`/`clause.signoffs` directly).
 */
const clauseInclude = { question: { select: questionSelect }, signoffs: true } as const;

/**
 * The scenario walk: read the instantiated blocks (clauses) of a session and
 * drive their statuses (FR-3.2–3.6). Clauses are scoped through their session's
 * partnership owner (SEC-5). Instantiation of the 30 blocks happens on session
 * creation (see SessionsService).
 */
@Injectable()
export class ScenarioService {
  constructor(private readonly prisma: PrismaService) {}

  async listClauses(user: AuthUser, partnershipId: string, sessionId: string): Promise<Clause[]> {
    await this.assertSessionAccess(user, partnershipId, sessionId);
    return this.prisma.clause.findMany({
      where: { sessionId },
      orderBy: { question: { orderIndex: 'asc' } },
      include: clauseInclude,
    });
  }

  /**
   * Set a partner's sign-off on a clause (FR-4.3): per-partner `agreed` with a
   * timestamp. A clause is "fully confirmed" once every partner has agreed —
   * the web derives that from the sign-offs returned by {@link listClauses}.
   */
  async setSignoff(
    user: AuthUser,
    partnershipId: string,
    sessionId: string,
    clauseId: string,
    partnerId: string,
    dto: SetSignoffDto,
  ): Promise<ClauseSignoff> {
    await this.assertSessionAccess(user, partnershipId, sessionId);
    const clause = await this.prisma.clause.findUnique({
      where: { id: clauseId },
      select: { sessionId: true },
    });
    if (!clause || clause.sessionId !== sessionId) {
      throw new NotFoundException('Clause not found');
    }
    const partner = await this.prisma.partner.findUnique({
      where: { id: partnerId },
      select: { partnershipId: true },
    });
    if (!partner || partner.partnershipId !== partnershipId) {
      throw new NotFoundException('Partner not found');
    }
    const signedAt = dto.agreed ? new Date() : null;
    return this.prisma.clauseSignoff.upsert({
      where: { clauseId_partnerId: { clauseId, partnerId } },
      update: { agreed: dto.agreed, signedAt },
      create: { clauseId, partnerId, agreed: dto.agreed, signedAt },
    });
  }

  async updateClause(
    user: AuthUser,
    partnershipId: string,
    sessionId: string,
    clauseId: string,
    dto: UpdateClauseDto,
  ): Promise<Clause> {
    await this.assertSessionAccess(user, partnershipId, sessionId);
    const clause = await this.getClauseInSession(clauseId, sessionId);

    const statusData: { status?: ClauseStatus; naReason?: string | null } = {};
    if (dto.status !== undefined) {
      // FR-3.4: "agreed" is only available when there is agreement text —
      // counting text being set in the same request.
      const effectiveText = dto.text !== undefined ? dto.text : clause.text;
      if (dto.status === ClauseStatus.agreed && !effectiveText?.trim()) {
        throw new ConflictException('A block can be marked agreed only when it has agreement text');
      }
      statusData.status = dto.status;
      // FR-3.6: keep the reason only while the block is "not applicable".
      statusData.naReason =
        dto.status === ClauseStatus.not_applicable ? (dto.naReason ?? null) : null;
    }

    const data = {
      // FR-4.1/4.2: capture formulation text + rationale. Source stays
      // `manual` (default) until AI drafting arrives in Phase 7.
      ...(dto.text !== undefined ? { text: dto.text } : {}),
      ...(dto.rationale !== undefined ? { rationale: dto.rationale } : {}),
      // FR-5.7/5.8: structured shares (block №5) / meaning of shares (block №6).
      ...(dto.structuredData !== undefined
        ? { structuredData: dto.structuredData as Prisma.InputJsonValue }
        : {}),
      ...statusData,
    };

    // FR-4.4: a transition to "agreed" is a significant event — snapshot the
    // agreed formulation as a version alongside the update.
    const becameAgreed =
      dto.status === ClauseStatus.agreed && clause.status !== ClauseStatus.agreed;
    if (!becameAgreed) {
      return this.prisma.clause.update({ where: { id: clauseId }, data, include: clauseInclude });
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.clause.update({
        where: { id: clauseId },
        data,
        include: clauseInclude,
      });
      await tx.clauseVersion.create({ data: this.versionData(updated, null) });
      return updated;
    });
  }

  async listVersions(
    user: AuthUser,
    partnershipId: string,
    sessionId: string,
    clauseId: string,
  ): Promise<ClauseVersion[]> {
    await this.assertSessionAccess(user, partnershipId, sessionId);
    await this.getClauseInSession(clauseId, sessionId);
    return this.prisma.clauseVersion.findMany({
      where: { clauseId },
      orderBy: { editedAt: 'desc' },
    });
  }

  /** Explicitly snapshot the clause's current formulation as a version (FR-4.4). */
  async saveVersion(
    user: AuthUser,
    partnershipId: string,
    sessionId: string,
    clauseId: string,
    dto: SaveVersionDto,
  ): Promise<ClauseVersion> {
    await this.assertSessionAccess(user, partnershipId, sessionId);
    const clause = await this.getClauseInSession(clauseId, sessionId);
    return this.prisma.clauseVersion.create({ data: this.versionData(clause, dto.note ?? null) });
  }

  /**
   * Roll the clause back to a past version (FR-4.4). The current formulation is
   * snapshotted first, so a restore never loses work and can itself be undone.
   */
  async restoreVersion(
    user: AuthUser,
    partnershipId: string,
    sessionId: string,
    clauseId: string,
    versionId: string,
  ): Promise<Clause> {
    await this.assertSessionAccess(user, partnershipId, sessionId);
    const clause = await this.getClauseInSession(clauseId, sessionId);
    const version = await this.prisma.clauseVersion.findUnique({ where: { id: versionId } });
    if (!version || version.clauseId !== clauseId) {
      throw new NotFoundException('Version not found');
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.clauseVersion.create({ data: this.versionData(clause, null) });
      return tx.clause.update({
        where: { id: clauseId },
        data: { text: version.text, rationale: version.rationale, status: version.status },
        include: clauseInclude,
      });
    });
  }

  private async assertSessionAccess(
    user: AuthUser,
    partnershipId: string,
    sessionId: string,
  ): Promise<void> {
    const partnership = await this.prisma.partnership.findUnique({
      where: { id: partnershipId },
      select: { ownerAccountId: true },
    });
    if (!partnership) {
      throw new NotFoundException('Partnership not found');
    }
    assertCanAccessOwned(user, partnership.ownerAccountId);
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { partnershipId: true },
    });
    if (!session || session.partnershipId !== partnershipId) {
      throw new NotFoundException('Session not found');
    }
  }

  private async getClauseInSession(clauseId: string, sessionId: string): Promise<Clause> {
    const clause = await this.prisma.clause.findUnique({ where: { id: clauseId } });
    if (!clause || clause.sessionId !== sessionId) {
      throw new NotFoundException('Clause not found');
    }
    return clause;
  }

  private versionData(
    clause: { id: string; text: string | null; rationale: string | null; status: ClauseStatus },
    note: string | null,
  ) {
    return {
      clauseId: clause.id,
      text: clause.text,
      rationale: clause.rationale,
      status: clause.status,
      note,
    };
  }
}
