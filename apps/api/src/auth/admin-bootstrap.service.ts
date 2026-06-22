import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccountStatus, Role } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from './password.service';

/**
 * Creates an initial admin from AUTH_ADMIN_EMAIL/AUTH_ADMIN_PASSWORD on first
 * boot, if both are set and no admin exists yet. Idempotent and a no-op
 * otherwise.
 */
@Injectable()
export class AdminBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const email = this.config.get<string>('AUTH_ADMIN_EMAIL')?.toLowerCase();
    const password = this.config.get<string>('AUTH_ADMIN_PASSWORD');
    if (!email || !password) {
      return;
    }

    const existingAdmin = await this.prisma.account.findFirst({ where: { role: Role.admin } });
    if (existingAdmin) {
      return;
    }
    if (await this.prisma.account.findUnique({ where: { email } })) {
      return;
    }

    await this.prisma.account.create({
      data: {
        email,
        passwordHash: await this.passwords.hash(password),
        role: Role.admin,
        status: AccountStatus.active,
        displayName: 'Administrator',
      },
    });
    this.logger.log(`Bootstrapped initial admin account: ${email}`);
  }
}
