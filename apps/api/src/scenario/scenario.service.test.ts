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

function makePrisma() {
  return {
    partnership: { findUnique: vi.fn() },
    session: { findUnique: vi.fn() },
    clause: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  };
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
});
