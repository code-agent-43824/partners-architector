import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { type Account, AccountStatus, Role } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from './auth.types';
import type { RegisterDto } from './dto';
import { PasswordService } from './password.service';

function toAuthUser(account: Account): AuthUser {
  return {
    id: account.id,
    email: account.email,
    role: account.role,
    displayName: account.displayName,
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly jwt: JwtService,
  ) {}

  /** Self-service registration creates an architect account (spec FR-1.1). */
  async register(dto: RegisterDto): Promise<AuthUser> {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.account.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const account = await this.prisma.account.create({
      data: {
        email,
        passwordHash: await this.passwords.hash(dto.password),
        role: Role.architect,
        displayName: dto.displayName ?? null,
      },
    });
    return toAuthUser(account);
  }

  /** Verifies credentials, returning the user or throwing 401. */
  async validateCredentials(email: string, password: string): Promise<AuthUser> {
    const account = await this.prisma.account.findUnique({ where: { email: email.toLowerCase() } });
    if (!account) {
      // Equalize timing to avoid trivial user enumeration.
      await this.passwords.hash('timing-equalization-decoy');
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await this.passwords.verify(account.passwordHash, password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (account.status !== AccountStatus.active) {
      throw new UnauthorizedException('Account is blocked');
    }
    return toAuthUser(account);
  }

  /** Signs the session JWT for an authenticated user. */
  issueToken(user: AuthUser): string {
    return this.jwt.sign({ sub: user.id, role: user.role });
  }
}
