import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { NotFoundException } from '@nestjs/common';
import { Role, SessionKind, SessionStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthUser } from '../auth/auth.types';
import type { PrismaService } from '../prisma/prisma.service';
import { SessionsService } from './sessions.service';

const architect: AuthUser = {
  id: 'arch-1',
  email: 'a@x.io',
  role: Role.architect,
  displayName: null,
};
const admin: AuthUser = { id: 'admin-1', email: 'admin@x.io', role: Role.admin, displayName: null };
const OTHER_OWNER = 'arch-2';
const PID = 'p-1';
const SID = 's-1';

function makePrisma() {
  const prisma = {
    partnership: { findUnique: vi.fn() },
    partner: { count: vi.fn() },
    question: { findMany: vi.fn() },
    clause: { createMany: vi.fn() },
    session: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  // Run the transactional callback against the same fake client.
  prisma.$transaction.mockImplementation((cb: (tx: typeof prisma) => unknown) => cb(prisma));
  return prisma;
}

describe('SessionsService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: SessionsService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new SessionsService(prisma as unknown as PrismaService);
  });

  function ownedBy(ownerAccountId: string) {
    prisma.partnership.findUnique.mockResolvedValue({ ownerAccountId });
  }

  it('list denies another architect but allows the owner and an admin', async () => {
    prisma.session.findMany.mockResolvedValue([]);

    ownedBy(OTHER_OWNER);
    await expect(service.list(architect, PID)).rejects.toBeInstanceOf(ForbiddenException);

    ownedBy(architect.id);
    await expect(service.list(architect, PID)).resolves.toEqual([]);

    ownedBy(OTHER_OWNER);
    await expect(service.list(admin, PID)).resolves.toEqual([]);
  });

  it('creates an initial session with no baseline and instantiates the blocks', async () => {
    ownedBy(architect.id);
    prisma.question.findMany.mockResolvedValue([{ id: 'q1' }, { id: 'q2' }]);
    prisma.session.create.mockResolvedValue({ id: SID });
    prisma.clause.createMany.mockResolvedValue({ count: 2 });
    await service.create(architect, PID, { kind: SessionKind.initial });
    expect(prisma.session.create).toHaveBeenCalledWith({
      data: { partnershipId: PID, kind: SessionKind.initial, title: null, baselineSessionId: null },
    });
    expect(prisma.clause.createMany).toHaveBeenCalledWith({
      data: [
        { sessionId: SID, questionId: 'q1' },
        { sessionId: SID, questionId: 'q2' },
      ],
    });
  });

  it('creates a review session referencing a baseline in the same partnership', async () => {
    ownedBy(architect.id);
    prisma.session.findUnique.mockResolvedValue({ id: 'base', partnershipId: PID });
    prisma.question.findMany.mockResolvedValue([{ id: 'q1' }]);
    prisma.session.create.mockResolvedValue({ id: SID });
    prisma.clause.createMany.mockResolvedValue({ count: 1 });
    await service.create(architect, PID, {
      kind: SessionKind.review,
      title: 'Q2',
      baselineSessionId: 'base',
    });
    expect(prisma.session.create).toHaveBeenCalledWith({
      data: {
        partnershipId: PID,
        kind: SessionKind.review,
        title: 'Q2',
        baselineSessionId: 'base',
      },
    });
    expect(prisma.clause.createMany).toHaveBeenCalledWith({
      data: [{ sessionId: SID, questionId: 'q1' }],
    });
  });

  it('rejects a review whose baseline is missing or in another partnership', async () => {
    ownedBy(architect.id);
    prisma.session.findUnique.mockResolvedValueOnce(null);
    await expect(
      service.create(architect, PID, { kind: SessionKind.review, baselineSessionId: 'nope' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    prisma.session.findUnique.mockResolvedValueOnce({ id: 'base', partnershipId: 'other' });
    await expect(
      service.create(architect, PID, { kind: SessionKind.review, baselineSessionId: 'base' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.session.create).not.toHaveBeenCalled();
  });

  it('starts a draft session only with at least 2 partners', async () => {
    ownedBy(architect.id);
    prisma.session.findUnique.mockResolvedValue({
      id: SID,
      partnershipId: PID,
      status: SessionStatus.draft,
    });
    prisma.partner.count.mockResolvedValue(2);
    prisma.session.update.mockResolvedValue({ id: SID, status: SessionStatus.in_progress });

    await service.start(architect, PID, SID);

    expect(prisma.session.update).toHaveBeenCalledWith({
      where: { id: SID },
      data: { status: SessionStatus.in_progress, startedAt: expect.any(Date) },
    });
  });

  it('refuses to start with fewer than 2 partners', async () => {
    ownedBy(architect.id);
    prisma.session.findUnique.mockResolvedValue({
      id: SID,
      partnershipId: PID,
      status: SessionStatus.draft,
    });
    prisma.partner.count.mockResolvedValue(1);

    await expect(service.start(architect, PID, SID)).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.session.update).not.toHaveBeenCalled();
  });

  it('refuses to start a session that is not a draft', async () => {
    ownedBy(architect.id);
    prisma.session.findUnique.mockResolvedValue({
      id: SID,
      partnershipId: PID,
      status: SessionStatus.in_progress,
    });
    await expect(service.start(architect, PID, SID)).rejects.toBeInstanceOf(ConflictException);
  });

  it('completes only an in-progress session', async () => {
    ownedBy(architect.id);
    prisma.session.findUnique.mockResolvedValue({
      id: SID,
      partnershipId: PID,
      status: SessionStatus.in_progress,
    });
    prisma.session.update.mockResolvedValue({ id: SID, status: SessionStatus.completed });
    await service.complete(architect, PID, SID);
    expect(prisma.session.update).toHaveBeenCalledWith({
      where: { id: SID },
      data: { status: SessionStatus.completed, completedAt: expect.any(Date) },
    });

    prisma.session.update.mockClear();
    prisma.session.findUnique.mockResolvedValue({
      id: SID,
      partnershipId: PID,
      status: SessionStatus.draft,
    });
    await expect(service.complete(architect, PID, SID)).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.session.update).not.toHaveBeenCalled();
  });

  it('remove requires the session to belong to the partnership', async () => {
    ownedBy(architect.id);
    prisma.session.findUnique.mockResolvedValue({ id: SID, partnershipId: 'other' });
    await expect(service.remove(architect, PID, SID)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.session.delete).not.toHaveBeenCalled();

    prisma.session.findUnique.mockResolvedValue({ id: SID, partnershipId: PID });
    prisma.session.delete.mockResolvedValue({ id: SID });
    await service.remove(architect, PID, SID);
    expect(prisma.session.delete).toHaveBeenCalledWith({ where: { id: SID } });
  });
});
