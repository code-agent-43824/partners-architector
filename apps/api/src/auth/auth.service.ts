import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { type Account, AccountStatus, Role } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from './auth.types';
import type { ChangePasswordDto, RegisterDto } from './dto';
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
    private readonly config: ConfigService,
  ) {}

  /** Self-service registration creates an architect account (spec FR-1.1). */
  async register(dto: RegisterDto): Promise<AuthUser> {
    const registrationCode = this.config.get<string>('AUTH_REGISTRATION_CODE');
    if (registrationCode && dto.registrationCode !== registrationCode) {
      throw new ForbiddenException('Registration code is invalid');
    }

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

  /** Changes the current user's password after verifying the old password. */
  async changePassword(user: AuthUser, dto: ChangePasswordDto): Promise<void> {
    const account = await this.prisma.account.findUnique({ where: { id: user.id } });
    if (!account) {
      throw new UnauthorizedException('Account unavailable');
    }
    const valid = await this.passwords.verify(account.passwordHash, dto.currentPassword);
    if (!valid) {
      throw new UnauthorizedException('Invalid current password');
    }
    await this.prisma.account.update({
      where: { id: user.id },
      data: { passwordHash: await this.passwords.hash(dto.newPassword) },
    });
  }
}
