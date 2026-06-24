import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PartnershipStatus, Role } from '@prisma/client';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

import type { AuthUser } from '../auth/auth.types';
import type { PrismaService } from '../prisma/prisma.service';
import { PartnershipsService } from './partnerships.service';

const architect: AuthUser = {
  id: 'arch-1',
  email: 'a@x.io',
  role: Role.architect,
  displayName: null,
};
const admin: AuthUser = { id: 'admin-1', email: 'admin@x.io', role: Role.admin, displayName: null };
const OTHER_OWNER = 'arch-2';

function makePrisma() {
  return {
    partnership: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
}

function lastWhere(fn: Mock): Record<string, unknown> {
  const arg = fn.mock.calls.at(-1)?.[0] as { where?: Record<string, unknown> } | undefined;
  return arg?.where ?? {};
}

describe('PartnershipsService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: PartnershipsService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new PartnershipsService(prisma as unknown as PrismaService);
  });

  it('create sets the owner to the current user', async () => {
    prisma.partnership.create.mockResolvedValue({ id: 'p1' });
    await service.create(architect, { name: 'Acme', typeTags: ['new'] });
    expect(prisma.partnership.create).toHaveBeenCalledWith({
      data: { ownerAccountId: 'arch-1', name: 'Acme', typeTags: ['new'], notes: null },
    });
  });

  it('list scopes by owner and status for an architect', async () => {
    prisma.partnership.findMany.mockResolvedValue([]);
    await service.list(architect, { status: 'active' });
    expect(lastWhere(prisma.partnership.findMany).ownerAccountId).toBe('arch-1');
    expect(lastWhere(prisma.partnership.findMany).status).toBe(PartnershipStatus.active);
  });

  it('list is unscoped for an admin and "all" status', async () => {
    prisma.partnership.findMany.mockResolvedValue([]);
    await service.list(admin, { status: 'all' });
    expect(lastWhere(prisma.partnership.findMany).ownerAccountId).toBeUndefined();
    expect(lastWhere(prisma.partnership.findMany).status).toBeUndefined();
  });

  it('get throws NotFound when missing', async () => {
    prisma.partnership.findUnique.mockResolvedValue(null);
    await expect(service.get(architect, 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it("get denies another architect's partnership but allows the owner and an admin", async () => {
    prisma.partnership.findUnique.mockResolvedValue({ id: 'p1', ownerAccountId: OTHER_OWNER });
    await expect(service.get(architect, 'p1')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.get(admin, 'p1')).resolves.toMatchObject({ id: 'p1' });

    prisma.partnership.findUnique.mockResolvedValue({ id: 'p1', ownerAccountId: architect.id });
    await expect(service.get(architect, 'p1')).resolves.toMatchObject({ id: 'p1' });
  });

  it('remove deletes for the owner but not for a non-owner', async () => {
    prisma.partnership.findUnique.mockResolvedValue({ id: 'p1', ownerAccountId: architect.id });
    prisma.partnership.delete.mockResolvedValue({ id: 'p1' });
    await service.remove(architect, 'p1');
    expect(prisma.partnership.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });

    prisma.partnership.delete.mockClear();
    prisma.partnership.findUnique.mockResolvedValue({ id: 'p2', ownerAccountId: OTHER_OWNER });
    await expect(service.remove(architect, 'p2')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.partnership.delete).not.toHaveBeenCalled();
  });
});
