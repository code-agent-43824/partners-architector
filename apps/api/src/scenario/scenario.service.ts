import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { type Clause, ClauseStatus } from '@prisma/client';

import type { AuthUser } from '../auth/auth.types';
import { assertCanAccessOwned } from '../common/ownership';
import { PrismaService } from '../prisma/prisma.service';
import type { UpdateClauseDto } from './dto';

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
      include: { question: { select: questionSelect } },
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
    const clause = await this.prisma.clause.findUnique({ where: { id: clauseId } });
    if (!clause || clause.sessionId !== sessionId) {
      throw new NotFoundException('Clause not found');
    }

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

    return this.prisma.clause.update({
      where: { id: clauseId },
      data: {
        // FR-4.1/4.2: capture formulation text + rationale. Source stays
        // `manual` (default) until AI drafting arrives in Phase 7.
        ...(dto.text !== undefined ? { text: dto.text } : {}),
        ...(dto.rationale !== undefined ? { rationale: dto.rationale } : {}),
        ...statusData,
      },
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
}
