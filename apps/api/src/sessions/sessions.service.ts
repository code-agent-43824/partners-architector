import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type Session, SessionKind, SessionStatus } from '@prisma/client';

import type { AuthUser } from '../auth/auth.types';
import { assertCanAccessOwned } from '../common/ownership';
import { PrismaService } from '../prisma/prisma.service';
import { QUESTION_SET_VERSION } from '../seed/questions';
import type { CreateSessionDto } from './dto';

/** A session needs at least this many partners before it can be started (FR-2.3/2.5). */
export const MIN_PARTNERS_TO_START = 2;

/**
 * Sessions are scoped through their partnership's owner (SEC-5). The status
 * lifecycle is draft → in_progress → completed; starting a session enforces
 * the deferred "≥2 partners" rule. Completion warnings about unclosed heavy
 * blocks / matrix / shares (FR-2.5) arrive with the phases that add those.
 */
@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser, partnershipId: string): Promise<Session[]> {
    await this.assertPartnershipAccess(user, partnershipId);
    return this.prisma.session.findMany({
      where: { partnershipId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(user: AuthUser, partnershipId: string, sessionId: string): Promise<Session> {
    await this.assertPartnershipAccess(user, partnershipId);
    return this.getOwnedSession(partnershipId, sessionId);
  }

  async create(user: AuthUser, partnershipId: string, dto: CreateSessionDto): Promise<Session> {
    await this.assertPartnershipAccess(user, partnershipId);
    if (dto.kind === SessionKind.review) {
      const baseline = await this.prisma.session.findUnique({
        where: { id: dto.baselineSessionId },
      });
      if (!baseline || baseline.partnershipId !== partnershipId) {
        throw new BadRequestException('Baseline session not found in this partnership');
      }
    }
    // FR-3.1: instantiate the 30 methodology blocks of the current question-set
    // version as clauses, atomically with the session. (Review sessions start
    // blank too; copying agreed wording from the baseline is FR-9.3, Phase 5.)
    const questions = await this.prisma.question.findMany({
      where: { questionSetVersion: QUESTION_SET_VERSION },
      orderBy: { orderIndex: 'asc' },
      select: { id: true },
    });
    return this.prisma.$transaction(async (tx) => {
      const session = await tx.session.create({
        data: {
          partnershipId,
          kind: dto.kind,
          title: dto.title ?? null,
          baselineSessionId: dto.kind === SessionKind.review ? dto.baselineSessionId : null,
        },
      });
      if (questions.length > 0) {
        await tx.clause.createMany({
          data: questions.map((question) => ({ sessionId: session.id, questionId: question.id })),
        });
      }
      return session;
    });
  }

  async start(user: AuthUser, partnershipId: string, sessionId: string): Promise<Session> {
    await this.assertPartnershipAccess(user, partnershipId);
    const session = await this.getOwnedSession(partnershipId, sessionId);
    if (session.status !== SessionStatus.draft) {
      throw new ConflictException('Only a draft session can be started');
    }
    const partnerCount = await this.prisma.partner.count({ where: { partnershipId } });
    if (partnerCount < MIN_PARTNERS_TO_START) {
      throw new ConflictException(
        `A session needs at least ${MIN_PARTNERS_TO_START} partners to start`,
      );
    }
    return this.prisma.session.update({
      where: { id: sessionId },
      data: { status: SessionStatus.in_progress, startedAt: new Date() },
    });
  }

  async complete(user: AuthUser, partnershipId: string, sessionId: string): Promise<Session> {
    await this.assertPartnershipAccess(user, partnershipId);
    const session = await this.getOwnedSession(partnershipId, sessionId);
    if (session.status !== SessionStatus.in_progress) {
      throw new ConflictException('Only an in-progress session can be completed');
    }
    // FR-2.5 completion warnings (heavy blocks / matrix / shares) are computed
    // once those features exist (clauses 1.4, matrix Phase 3, shares Phase 2).
    return this.prisma.session.update({
      where: { id: sessionId },
      data: { status: SessionStatus.completed, completedAt: new Date() },
    });
  }

  async remove(user: AuthUser, partnershipId: string, sessionId: string): Promise<void> {
    await this.assertPartnershipAccess(user, partnershipId);
    await this.getOwnedSession(partnershipId, sessionId);
    await this.prisma.session.delete({ where: { id: sessionId } });
  }

  private async assertPartnershipAccess(user: AuthUser, partnershipId: string): Promise<void> {
    const partnership = await this.prisma.partnership.findUnique({
      where: { id: partnershipId },
      select: { ownerAccountId: true },
    });
    if (!partnership) {
      throw new NotFoundException('Partnership not found');
    }
    assertCanAccessOwned(user, partnership.ownerAccountId);
  }

  private async getOwnedSession(partnershipId: string, sessionId: string): Promise<Session> {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session || session.partnershipId !== partnershipId) {
      throw new NotFoundException('Session not found');
    }
    return session;
  }
}
