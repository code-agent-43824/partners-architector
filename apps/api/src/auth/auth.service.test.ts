import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import type { PasswordService } from './password.service';

function makePrisma() {
  return {
    account: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };
}

function makeConfig(registrationCode?: string) {
  return {
    get: vi.fn((key: string) => (key === 'AUTH_REGISTRATION_CODE' ? registrationCode : undefined)),
  };
}

describe('AuthService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let passwords: { hash: ReturnType<typeof vi.fn>; verify: ReturnType<typeof vi.fn> };
  let jwt: { sign: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    prisma = makePrisma();
    passwords = {
      hash: vi.fn().mockResolvedValue('hashed-password'),
      verify: vi.fn(),
    };
    jwt = { sign: vi.fn() };
  });

  function service(registrationCode?: string) {
    return new AuthService(
      prisma as unknown as PrismaService,
      passwords as unknown as PasswordService,
      jwt as never,
      makeConfig(registrationCode) as never,
    );
  }

  it('registers an architect when the registration code is not configured', async () => {
    prisma.account.findUnique.mockResolvedValue(null);
    prisma.account.create.mockResolvedValue({
      id: 'acc-1',
      email: 'user@example.com',
      role: Role.architect,
      displayName: 'User',
    });

    await expect(
      service().register({
        email: 'USER@example.com',
        password: 'secret-pass',
        displayName: 'User',
      }),
    ).resolves.toEqual({
      id: 'acc-1',
      email: 'user@example.com',
      role: Role.architect,
      displayName: 'User',
    });

    expect(prisma.account.findUnique).toHaveBeenCalledWith({
      where: { email: 'user@example.com' },
    });
    expect(prisma.account.create).toHaveBeenCalledWith({
      data: {
        email: 'user@example.com',
        passwordHash: 'hashed-password',
        role: Role.architect,
        displayName: 'User',
      },
    });
  });

  it('rejects registration before account lookup when the configured code is missing or wrong', async () => {
    await expect(
      service('invite-123').register({
        email: 'new@example.com',
        password: 'secret-pass',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    await expect(
      service('invite-123').register({
        email: 'new@example.com',
        password: 'secret-pass',
        registrationCode: 'wrong',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.account.findUnique).not.toHaveBeenCalled();
    expect(prisma.account.create).not.toHaveBeenCalled();
  });

  it('accepts registration when the configured code matches', async () => {
    prisma.account.findUnique.mockResolvedValue(null);
    prisma.account.create.mockResolvedValue({
      id: 'acc-2',
      email: 'new@example.com',
      role: Role.architect,
      displayName: null,
    });

    await service('invite-123').register({
      email: 'new@example.com',
      password: 'secret-pass',
      registrationCode: 'invite-123',
    });

    expect(prisma.account.create).toHaveBeenCalledWith({
      data: {
        email: 'new@example.com',
        passwordHash: 'hashed-password',
        role: Role.architect,
        displayName: null,
      },
    });
  });

  it('keeps the duplicate-email conflict for a valid registration code', async () => {
    prisma.account.findUnique.mockResolvedValue({ id: 'existing' });

    await expect(
      service('invite-123').register({
        email: 'taken@example.com',
        password: 'secret-pass',
        registrationCode: 'invite-123',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.account.create).not.toHaveBeenCalled();
  });

  it('changes the password after verifying the current password', async () => {
    prisma.account.findUnique.mockResolvedValue({
      id: 'acc-1',
      passwordHash: 'old-hash',
    });
    passwords.verify.mockResolvedValue(true);
    passwords.hash.mockResolvedValue('new-hash');
    prisma.account.update.mockResolvedValue({ id: 'acc-1' });

    await service().changePassword(
      { id: 'acc-1', email: 'user@example.com', role: Role.architect, displayName: null },
      { currentPassword: 'old-password', newPassword: 'new-password' },
    );

    expect(passwords.verify).toHaveBeenCalledWith('old-hash', 'old-password');
    expect(prisma.account.update).toHaveBeenCalledWith({
      where: { id: 'acc-1' },
      data: { passwordHash: 'new-hash' },
    });
  });

  it('rejects password change when the current password is wrong', async () => {
    prisma.account.findUnique.mockResolvedValue({
      id: 'acc-1',
      passwordHash: 'old-hash',
    });
    passwords.verify.mockResolvedValue(false);

    await expect(
      service().changePassword(
        { id: 'acc-1', email: 'user@example.com', role: Role.architect, displayName: null },
        { currentPassword: 'wrong-password', newPassword: 'new-password' },
      ),
    ).rejects.toMatchObject({ status: 401 });

    expect(passwords.hash).not.toHaveBeenCalled();
    expect(prisma.account.update).not.toHaveBeenCalled();
  });
});
