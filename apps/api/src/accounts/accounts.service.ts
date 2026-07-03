import { Injectable, NotFoundException } from '@nestjs/common';
import { type AccountStatus, Role } from '@prisma/client';

import { PasswordService } from '../auth/password.service';
import { PrismaService } from '../prisma/prisma.service';

const ACCOUNT_SUMMARY = {
  id: true,
  email: true,
  role: true,
  status: true,
  displayName: true,
  createdAt: true,
} as const;

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
  ) {}

  /** Architect accounts for the admin user-management screen (FR-1.5). */
  listArchitects() {
    return this.prisma.account.findMany({
      where: { role: Role.architect },
      orderBy: { createdAt: 'asc' },
      select: ACCOUNT_SUMMARY,
    });
  }

  /** Block or re-activate an account (FR-1.5). */
  async setStatus(id: string, status: AccountStatus) {
    const existing = await this.prisma.account.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Account not found');
    }
    return this.prisma.account.update({ where: { id }, data: { status }, select: ACCOUNT_SUMMARY });
  }

  /** Admin reset for a user's password (W3). Returns only account metadata. */
  async resetPassword(id: string, password: string) {
    const existing = await this.prisma.account.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Account not found');
    }
    return this.prisma.account.update({
      where: { id },
      data: { passwordHash: await this.passwords.hash(password) },
      select: ACCOUNT_SUMMARY,
    });
  }
}
