import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AccountStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser, JwtPayload } from './auth.types';
import { SESSION_COOKIE } from './cookies';
import { IS_PUBLIC_KEY } from './public.decorator';

interface AuthRequest {
  cookies?: Record<string, string | undefined>;
  user?: AuthUser;
}

/**
 * Authenticates requests from the session JWT cookie and loads the account on
 * every request, so blocked/deleted accounts lose access immediately. Routes
 * (or controllers) marked @Public are skipped.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthRequest>();
    const token = request.cookies?.[SESSION_COOKIE];
    if (!token) {
      throw new UnauthorizedException('Not authenticated');
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid session');
    }

    const account = await this.prisma.account.findUnique({ where: { id: payload.sub } });
    if (!account || account.status !== AccountStatus.active) {
      throw new UnauthorizedException('Account unavailable');
    }

    request.user = {
      id: account.id,
      email: account.email,
      role: account.role,
      displayName: account.displayName,
      guidedMode: account.guidedMode,
    };
    return true;
  }
}
