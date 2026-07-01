import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ClauseStatus, Role } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthUser } from '../auth/auth.types';
import type { PrismaService } from '../prisma/prisma.service';
import { ScenarioService } from './scenario.service';

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
const CID = 'c-1';
const PARTNER = 'partner-1';
const VID = 'v-1';

function makePrisma() {
  const prisma = {
    partnership: { findUnique: vi.fn() },
    session: { findUnique: vi.fn() },
    partner: { findUnique: vi.fn() },
    clause: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    clauseSignoff: { upsert: vi.fn() },
    clauseVersion: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
    $transaction: vi.fn(),
  };
  prisma.$transaction.mockImplementation((cb: (tx: typeof prisma) => unknown) => cb(prisma));
  return prisma;
}

describe('ScenarioService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: ScenarioService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new ScenarioService(prisma as unknown as PrismaService);
  });

  function grantAccess(ownerAccountId: string = architect.id) {
    prisma.partnership.findUnique.mockResolvedValue({ ownerAccountId });
    prisma.session.findUnique.mockResolvedValue({ partnershipId: PID });
  }

  it('list denies another architect but allows the owner and an admin', async () => {
    prisma.clause.findMany.mockResolvedValue([]);

    grantAccess(OTHER_OWNER);
    await expect(service.listClauses(architect, PID, SID)).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    grantAccess(architect.id);
    await expect(service.listClauses(architect, PID, SID)).resolves.toEqual([]);

    grantAccess(OTHER_OWNER);
    await expect(service.listClauses(admin, PID, SID)).resolves.toEqual([]);
  });

  it('throws NotFound when the session is not in the partnership', async () => {
    prisma.partnership.findUnique.mockResolvedValue({ ownerAccountId: architect.id });
    prisma.session.findUnique.mockResolvedValue({ partnershipId: 'other' });
    await expect(service.listClauses(architect, PID, SID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updateStatus throws NotFound for a clause in another session', async () => {
    grantAccess();
    prisma.clause.findUnique.mockResolvedValue({ id: CID, sessionId: 'other-session' });
    await expect(
      service.updateClause(architect, PID, SID, CID, { status: ClauseStatus.in_progress }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuses "agreed" without agreement text but allows it once text exists', async () => {
    grantAccess();
    prisma.clause.findUnique.mockResolvedValue({ id: CID, sessionId: SID, text: null });
    await expect(
      service.updateClause(architect, PID, SID, CID, { status: ClauseStatus.agreed }),
    ).rejects.toBeInstanceOf(ConflictException);

    prisma.clause.findUnique.mockResolvedValue({ id: CID, sessionId: SID, text: 'agreed wording' });
    prisma.clause.update.mockResolvedValue({ id: CID, status: ClauseStatus.agreed });
    await service.updateClause(architect, PID, SID, CID, { status: ClauseStatus.agreed });
    expect(prisma.clause.update).toHaveBeenCalledWith({
      where: { id: CID },
      data: { status: ClauseStatus.agreed, naReason: null },
    });
  });

  it('keeps the reason only while "not applicable"', async () => {
    grantAccess();
    prisma.clause.findUnique.mockResolvedValue({ id: CID, sessionId: SID, text: null });
    prisma.clause.update.mockResolvedValue({});

    await service.updateClause(architect, PID, SID, CID, {
      status: ClauseStatus.not_applicable,
      naReason: 'не наш случай',
    });
    expect(prisma.clause.update).toHaveBeenCalledWith({
      where: { id: CID },
      data: { status: ClauseStatus.not_applicable, naReason: 'не наш случай' },
    });

    prisma.clause.update.mockClear();
    await service.updateClause(architect, PID, SID, CID, { status: ClauseStatus.parked });
    expect(prisma.clause.update).toHaveBeenCalledWith({
      where: { id: CID },
      data: { status: ClauseStatus.parked, naReason: null },
    });
  });

  it('saves formulation text and rationale', async () => {
    grantAccess();
    prisma.clause.findUnique.mockResolvedValue({ id: CID, sessionId: SID, text: null });
    prisma.clause.update.mockResolvedValue({});
    await service.updateClause(architect, PID, SID, CID, {
      text: 'agreed wording',
      rationale: 'why',
    });
    expect(prisma.clause.update).toHaveBeenCalledWith({
      where: { id: CID },
      data: { text: 'agreed wording', rationale: 'why' },
    });
  });

  it('allows "agreed" when text is provided in the same request', async () => {
    grantAccess();
    prisma.clause.findUnique.mockResolvedValue({ id: CID, sessionId: SID, text: null });
    prisma.clause.update.mockResolvedValue({});
    await service.updateClause(architect, PID, SID, CID, {
      status: ClauseStatus.agreed,
      text: 'wording',
    });
    expect(prisma.clause.update).toHaveBeenCalledWith({
      where: { id: CID },
      data: { text: 'wording', status: ClauseStatus.agreed, naReason: null },
    });
  });

  function grantSignoffAccess() {
    grantAccess();
    prisma.clause.findUnique.mockResolvedValue({ sessionId: SID });
    prisma.partner.findUnique.mockResolvedValue({ partnershipId: PID });
  }

  it('setSignoff upserts a partner agreement with a timestamp', async () => {
    grantSignoffAccess();
    prisma.clauseSignoff.upsert.mockResolvedValue({});
    await service.setSignoff(architect, PID, SID, CID, PARTNER, { agreed: true });
    expect(prisma.clauseSignoff.upsert).toHaveBeenCalledWith({
      where: { clauseId_partnerId: { clauseId: CID, partnerId: PARTNER } },
      update: { agreed: true, signedAt: expect.any(Date) },
      create: { clauseId: CID, partnerId: PARTNER, agreed: true, signedAt: expect.any(Date) },
    });
  });

  it('setSignoff clears the timestamp when agreed is false', async () => {
    grantSignoffAccess();
    prisma.clauseSignoff.upsert.mockResolvedValue({});
    await service.setSignoff(architect, PID, SID, CID, PARTNER, { agreed: false });
    expect(prisma.clauseSignoff.upsert).toHaveBeenCalledWith({
      where: { clauseId_partnerId: { clauseId: CID, partnerId: PARTNER } },
      update: { agreed: false, signedAt: null },
      create: { clauseId: CID, partnerId: PARTNER, agreed: false, signedAt: null },
    });
  });

  it('setSignoff rejects a partner from another partnership', async () => {
    grantAccess();
    prisma.clause.findUnique.mockResolvedValue({ sessionId: SID });
    prisma.partner.findUnique.mockResolvedValue({ partnershipId: 'other' });
    await expect(
      service.setSignoff(architect, PID, SID, CID, PARTNER, { agreed: true }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.clauseSignoff.upsert).not.toHaveBeenCalled();
  });

  it('setSignoff rejects a clause from another session', async () => {
    grantAccess();
    prisma.clause.findUnique.mockResolvedValue({ sessionId: 'other-session' });
    await expect(
      service.setSignoff(architect, PID, SID, CID, PARTNER, { agreed: true }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.clauseSignoff.upsert).not.toHaveBeenCalled();
  });

  it('snapshots a version when a block transitions to agreed', async () => {
    grantAccess();
    prisma.clause.findUnique.mockResolvedValue({
      id: CID,
      sessionId: SID,
      text: null,
      status: ClauseStatus.in_progress,
    });
    prisma.clause.update.mockResolvedValue({
      id: CID,
      text: 'wording',
      rationale: null,
      status: ClauseStatus.agreed,
    });
    await service.updateClause(architect, PID, SID, CID, {
      status: ClauseStatus.agreed,
      text: 'wording',
    });
    expect(prisma.clauseVersion.create).toHaveBeenCalledWith({
      data: {
        clauseId: CID,
        text: 'wording',
        rationale: null,
        status: ClauseStatus.agreed,
        note: null,
      },
    });
  });

  it('does not snapshot when the block is already agreed', async () => {
    grantAccess();
    prisma.clause.findUnique.mockResolvedValue({
      id: CID,
      sessionId: SID,
      text: 'wording',
      status: ClauseStatus.agreed,
    });
    prisma.clause.update.mockResolvedValue({});
    await service.updateClause(architect, PID, SID, CID, { rationale: 'more' });
    expect(prisma.clauseVersion.create).not.toHaveBeenCalled();
  });

  it('saveVersion snapshots the current formulation with a note', async () => {
    grantAccess();
    prisma.clause.findUnique.mockResolvedValue({
      id: CID,
      sessionId: SID,
      text: 'current',
      rationale: 'why',
      status: ClauseStatus.in_progress,
    });
    prisma.clauseVersion.create.mockResolvedValue({});
    await service.saveVersion(architect, PID, SID, CID, { note: 'checkpoint' });
    expect(prisma.clauseVersion.create).toHaveBeenCalledWith({
      data: {
        clauseId: CID,
        text: 'current',
        rationale: 'why',
        status: ClauseStatus.in_progress,
        note: 'checkpoint',
      },
    });
  });

  it('restoreVersion snapshots the current state then applies the version', async () => {
    grantAccess();
    prisma.clause.findUnique.mockResolvedValue({
      id: CID,
      sessionId: SID,
      text: 'current',
      rationale: null,
      status: ClauseStatus.in_progress,
    });
    prisma.clauseVersion.findUnique.mockResolvedValue({
      id: VID,
      clauseId: CID,
      text: 'old wording',
      rationale: 'old why',
      status: ClauseStatus.agreed,
    });
    prisma.clause.update.mockResolvedValue({});
    await service.restoreVersion(architect, PID, SID, CID, VID);
    expect(prisma.clauseVersion.create).toHaveBeenCalledWith({
      data: {
        clauseId: CID,
        text: 'current',
        rationale: null,
        status: ClauseStatus.in_progress,
        note: null,
      },
    });
    expect(prisma.clause.update).toHaveBeenCalledWith({
      where: { id: CID },
      data: { text: 'old wording', rationale: 'old why', status: ClauseStatus.agreed },
    });
  });

  it('restoreVersion rejects a version from another clause', async () => {
    grantAccess();
    prisma.clause.findUnique.mockResolvedValue({
      id: CID,
      sessionId: SID,
      status: ClauseStatus.in_progress,
    });
    prisma.clauseVersion.findUnique.mockResolvedValue({ id: VID, clauseId: 'other-clause' });
    await expect(service.restoreVersion(architect, PID, SID, CID, VID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.clause.update).not.toHaveBeenCalled();
  });
});
