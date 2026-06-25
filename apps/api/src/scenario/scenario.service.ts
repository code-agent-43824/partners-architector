import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { type Clause, ClauseStatus } from '@prisma/client';

import type { AuthUser } from '../auth/auth.types';
import { assertCanAccessOwned } from '../common/ownership';
import { PrismaService } from '../prisma/prisma.service';
import type { UpdateClauseStatusDto } from './dto';

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

  async updateStatus(
    user: AuthUser,
    partnershipId: string,
    sessionId: string,
    clauseId: string,
    dto: UpdateClauseStatusDto,
  ): Promise<Clause> {
    await this.assertSessionAccess(user, partnershipId, sessionId);
    const clause = await this.prisma.clause.findUnique({ where: { id: clauseId } });
    if (!clause || clause.sessionId !== sessionId) {
      throw new NotFoundException('Clause not found');
    }
    // FR-3.4: "agreed" is only available when there is agreement text.
    if (dto.status === ClauseStatus.agreed && !clause.text?.trim()) {
      throw new ConflictException('A block can be marked agreed only when it has agreement text');
    }
    return this.prisma.clause.update({
      where: { id: clauseId },
      data: {
        status: dto.status,
        // FR-3.6: keep the reason only while the block is "not applicable".
        naReason: dto.status === ClauseStatus.not_applicable ? (dto.naReason ?? null) : null,
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
