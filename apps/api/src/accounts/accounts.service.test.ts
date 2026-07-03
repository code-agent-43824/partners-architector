import { NotFoundException } from '@nestjs/common';
import { AccountStatus, Role } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import type { PasswordService } from '../auth/password.service';
import type { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from './accounts.service';

function makePrisma() {
  return {
    account: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };
}

function firstCallArg(fn: Mock) {
  const first = fn.mock.calls[0]?.[0];
  if (!first) {
    throw new Error('Expected mock to have been called');
  }
  return first as { select?: Record<string, unknown> };
}

describe('AccountsService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let passwords: { hash: ReturnType<typeof vi.fn> };
  let service: AccountsService;

  beforeEach(() => {
    prisma = makePrisma();
    passwords = { hash: vi.fn().mockResolvedValue('new-hash') };
    service = new AccountsService(
      prisma as unknown as PrismaService,
      passwords as unknown as PasswordService,
    );
  });

  it('lists only architect account summaries', async () => {
    prisma.account.findMany.mockResolvedValue([]);

    await service.listArchitects();

    expect(prisma.account.findMany).toHaveBeenCalledWith({
      where: { role: Role.architect },
      orderBy: { createdAt: 'asc' },
      select: expect.objectContaining({ email: true }),
    });
    expect(firstCallArg(prisma.account.findMany).select).not.toHaveProperty('passwordHash');
  });

  it('updates account status without returning password hash', async () => {
    prisma.account.findUnique.mockResolvedValue({ id: 'acc-1' });
    prisma.account.update.mockResolvedValue({ id: 'acc-1', status: AccountStatus.blocked });

    await service.setStatus('acc-1', AccountStatus.blocked);

    expect(prisma.account.update).toHaveBeenCalledWith({
      where: { id: 'acc-1' },
      data: { status: AccountStatus.blocked },
      select: expect.objectContaining({ email: true }),
    });
    expect(firstCallArg(prisma.account.update).select).not.toHaveProperty('passwordHash');
  });

  it('resets a password without returning password hash', async () => {
    prisma.account.findUnique.mockResolvedValue({ id: 'acc-1' });
    prisma.account.update.mockResolvedValue({ id: 'acc-1', email: 'user@example.com' });

    await service.resetPassword('acc-1', 'temporary-password');

    expect(passwords.hash).toHaveBeenCalledWith('temporary-password');
    expect(prisma.account.update).toHaveBeenCalledWith({
      where: { id: 'acc-1' },
      data: { passwordHash: 'new-hash' },
      select: expect.objectContaining({ email: true }),
    });
    expect(firstCallArg(prisma.account.update).select).not.toHaveProperty('passwordHash');
  });

  it('throws when resetting a missing account', async () => {
    prisma.account.findUnique.mockResolvedValue(null);

    await expect(service.resetPassword('missing', 'temporary-password')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(prisma.account.update).not.toHaveBeenCalled();
  });
});
