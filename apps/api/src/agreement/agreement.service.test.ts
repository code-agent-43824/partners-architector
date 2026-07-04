import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ClauseStatus, Role, SessionKind, SessionStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthUser } from '../auth/auth.types';
import type { PrismaService } from '../prisma/prisma.service';
import { AgreementService } from './agreement.service';

const architect: AuthUser = {
  id: 'arch-1',
  email: 'a@x.io',
  role: Role.architect,
  displayName: null,
};
const PID = 'p-1';
const SID = 's-1';

function makePrisma() {
  return {
    partnership: { findUnique: vi.fn() },
    session: { findUnique: vi.fn() },
    partner: { findMany: vi.fn() },
    clause: { findMany: vi.fn() },
  };
}

function clause(number: number, over: Record<string, unknown> = {}) {
  return {
    status: ClauseStatus.not_started,
    text: null,
    rationale: null,
    naReason: null,
    structuredData: null,
    signoffs: [],
    question: { number, title: `Блок ${number}`, category: 'Контур', isSensitive: false },
    ...over,
  };
}

describe('AgreementService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: AgreementService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new AgreementService(prisma as unknown as PrismaService);
  });

  function grant(ownerAccountId = architect.id) {
    prisma.partnership.findUnique.mockResolvedValue({ name: 'Кофейня', ownerAccountId });
    prisma.session.findUnique.mockResolvedValue({
      partnershipId: PID,
      title: 'Первичная',
      kind: SessionKind.initial,
      status: SessionStatus.in_progress,
    });
  }

  it('denies another architect but allows the owner', async () => {
    prisma.partner.findMany.mockResolvedValue([]);
    prisma.clause.findMany.mockResolvedValue([]);

    grant('someone-else');
    await expect(service.assemble(architect, PID, SID)).rejects.toBeInstanceOf(ForbiddenException);

    grant(architect.id);
    await expect(service.assemble(architect, PID, SID)).resolves.toMatchObject({
      partnershipName: 'Кофейня',
    });
  });

  it('404s when the session is not in the partnership', async () => {
    grant();
    prisma.session.findUnique.mockResolvedValue({ partnershipId: 'other' });
    await expect(service.assemble(architect, PID, SID)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('assembles principles, ordered sections, shares, meaning and a summary', async () => {
    grant();
    prisma.partner.findMany.mockResolvedValue([
      { id: 'pa', fullName: 'Иван', role: 'Сооснователь' },
      { id: 'pb', fullName: 'Мария', role: null },
    ]);
    prisma.clause.findMany.mockResolvedValue([
      clause(1, {
        status: ClauseStatus.agreed,
        text: '<p>Иван и Мария</p>',
        signoffs: [
          { partnerId: 'pa', agreed: true },
          { partnerId: 'pb', agreed: true },
        ],
      }),
      clause(5, {
        status: ClauseStatus.agreed,
        structuredData: {
          shares: {
            mode: 'manual',
            allocations: [
              { partnerId: 'pa', percent: 60 },
              { partnerId: 'pb', percent: 40 },
            ],
          },
        },
        signoffs: [{ partnerId: 'pa', agreed: true }],
      }),
      clause(6, {
        status: ClauseStatus.in_progress,
        structuredData: {
          meaning: { voting: true, profit: true, ownership: false, losses: false },
        },
      }),
      clause(12, { status: ClauseStatus.not_applicable, naReason: 'Нет инвесторов' }),
    ]);

    const doc = await service.assemble(architect, PID, SID);

    expect(doc.principles).toHaveLength(4);
    expect(doc.participants).toEqual([
      { fullName: 'Иван', role: 'Сооснователь' },
      { fullName: 'Мария', role: null },
    ]);
    expect(doc.sections.map((s) => s.number)).toEqual([1, 5, 6, 12]);

    const shares = doc.sections.find((s) => s.number === 5)?.shares;
    expect(shares).toEqual({
      allocations: [
        { partnerName: 'Иван', percent: 60 },
        { partnerName: 'Мария', percent: 40 },
      ],
      total: 100,
    });
    expect(doc.sections.find((s) => s.number === 6)?.meaning).toEqual({
      voting: true,
      profit: true,
      ownership: false,
      losses: false,
    });
    // Only blocks 5/6 carry structured data.
    expect(doc.sections.find((s) => s.number === 1)?.shares).toBeNull();

    // na block excluded from "applicable"; only block 1 is fully confirmed.
    expect(doc.summary).toEqual({ total: 4, applicable: 3, agreed: 2, fullyConfirmed: 1 });
    expect(doc.sections.find((s) => s.number === 12)?.naReason).toBe('Нет инвесторов');
  });
});
