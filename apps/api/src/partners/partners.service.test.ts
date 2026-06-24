import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthUser } from '../auth/auth.types';
import type { PrismaService } from '../prisma/prisma.service';
import { PartnersService } from './partners.service';

const architect: AuthUser = {
  id: 'arch-1',
  email: 'a@x.io',
  role: Role.architect,
  displayName: null,
};
const admin: AuthUser = { id: 'admin-1', email: 'admin@x.io', role: Role.admin, displayName: null };
const OTHER_OWNER = 'arch-2';
const PID = 'p-1';

function makePrisma() {
  return {
    partnership: { findUnique: vi.fn() },
    partner: {
      count: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  };
}

describe('PartnersService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: PartnersService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new PartnersService(prisma as unknown as PrismaService);
  });

  function ownedBy(ownerAccountId: string) {
    prisma.partnership.findUnique.mockResolvedValue({ ownerAccountId });
  }

  it('list denies another architect but allows the owner and an admin', async () => {
    prisma.partner.findMany.mockResolvedValue([]);

    ownedBy(OTHER_OWNER);
    await expect(service.list(architect, PID)).rejects.toBeInstanceOf(ForbiddenException);

    ownedBy(architect.id);
    await expect(service.list(architect, PID)).resolves.toEqual([]);

    ownedBy(OTHER_OWNER);
    await expect(service.list(admin, PID)).resolves.toEqual([]);
  });

  it('throws NotFound when the partnership is missing', async () => {
    prisma.partnership.findUnique.mockResolvedValue(null);
    await expect(service.list(architect, PID)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('add appends after the last partner and scopes to the partnership', async () => {
    ownedBy(architect.id);
    prisma.partner.count.mockResolvedValue(2);
    prisma.partner.findFirst.mockResolvedValue({ orderIndex: 4 });
    prisma.partner.create.mockResolvedValue({ id: 'new' });

    await service.add(architect, PID, { fullName: 'Иван', role: 'CEO' });

    expect(prisma.partner.create).toHaveBeenCalledWith({
      data: { partnershipId: PID, fullName: 'Иван', role: 'CEO', contact: null, orderIndex: 5 },
    });
  });

  it('add uses orderIndex 0 for the first partner', async () => {
    ownedBy(architect.id);
    prisma.partner.count.mockResolvedValue(0);
    prisma.partner.findFirst.mockResolvedValue(null);
    prisma.partner.create.mockResolvedValue({ id: 'new' });

    await service.add(architect, PID, { fullName: 'Иван' });

    expect(prisma.partner.create).toHaveBeenCalledWith({
      data: { partnershipId: PID, fullName: 'Иван', role: null, contact: null, orderIndex: 0 },
    });
  });

  it('add rejects beyond the hard cap of 5', async () => {
    ownedBy(architect.id);
    prisma.partner.count.mockResolvedValue(5);

    await expect(service.add(architect, PID, { fullName: 'Шестой' })).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.partner.create).not.toHaveBeenCalled();
  });

  it('remove requires the partner to belong to the partnership', async () => {
    ownedBy(architect.id);
    prisma.partner.findUnique.mockResolvedValue({ id: 'x', partnershipId: 'other-partnership' });

    await expect(service.remove(architect, PID, 'x')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.partner.delete).not.toHaveBeenCalled();
  });

  it('remove deletes a partner owned through the partnership', async () => {
    ownedBy(architect.id);
    prisma.partner.findUnique.mockResolvedValue({ id: 'x', partnershipId: PID });
    prisma.partner.delete.mockResolvedValue({ id: 'x' });

    await service.remove(architect, PID, 'x');

    expect(prisma.partner.delete).toHaveBeenCalledWith({ where: { id: 'x' } });
  });

  it('reorder rejects a list that is not a permutation of the current partners', async () => {
    ownedBy(architect.id);
    prisma.partner.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);

    await expect(service.reorder(architect, PID, { ids: ['a'] })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.reorder(architect, PID, { ids: ['a', 'a'] })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.reorder(architect, PID, { ids: ['a', 'c'] })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.partner.update).not.toHaveBeenCalled();
  });

  it('reorder reassigns orderIndex by position', async () => {
    ownedBy(architect.id);
    prisma.partner.findMany.mockResolvedValueOnce([{ id: 'a' }, { id: 'b' }]); // existence read
    prisma.partner.update.mockResolvedValue({});
    prisma.partner.findMany.mockResolvedValueOnce([{ id: 'b' }, { id: 'a' }]); // final ordered read

    await service.reorder(architect, PID, { ids: ['b', 'a'] });

    expect(prisma.partner.update).toHaveBeenCalledWith({
      where: { id: 'b' },
      data: { orderIndex: 0 },
    });
    expect(prisma.partner.update).toHaveBeenCalledWith({
      where: { id: 'a' },
      data: { orderIndex: 1 },
    });
  });
});
