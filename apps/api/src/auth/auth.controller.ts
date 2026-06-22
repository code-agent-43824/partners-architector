import { randomBytes } from 'node:crypto';

import { Body, Controller, Get, HttpCode, Post, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';

import { ZodBody } from '../common/zod-validation.pipe';
import { AuthService } from './auth.service';
import type { AuthUser } from './auth.types';
import { COOKIE_MAX_AGE_MS, CSRF_COOKIE, SESSION_COOKIE } from './cookies';
import { CurrentUser } from './current-user.decorator';
import { type LoginDto, loginSchema, type RegisterDto, registerSchema } from './dto';
import { Public } from './public.decorator';

/** Minimal cookie surface we rely on (avoids a hard express type dependency). */
interface CookieResponse {
  cookie(name: string, value: string, options: Record<string, unknown>): void;
  clearCookie(name: string, options?: Record<string, unknown>): void;
}

const AUTH_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('register')
  @HttpCode(201)
  register(@Body(new ZodBody(registerSchema)) dto: RegisterDto): Promise<AuthUser> {
    return this.auth.register(dto);
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('login')
  @HttpCode(200)
  async login(
    @Body(new ZodBody(loginSchema)) dto: LoginDto,
    @Res({ passthrough: true }) res: CookieResponse,
  ): Promise<AuthUser> {
    const user = await this.auth.validateCredentials(dto.email, dto.password);
    res.cookie(SESSION_COOKIE, this.auth.issueToken(user), this.sessionCookieOptions());
    res.cookie(CSRF_COOKIE, randomBytes(32).toString('hex'), this.csrfCookieOptions());
    return user;
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: CookieResponse): void {
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    res.clearCookie(CSRF_COOKIE, { path: '/' });
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }

  private get secure(): boolean {
    return this.config.get<boolean>('AUTH_COOKIE_SECURE') ?? false;
  }

  private sessionCookieOptions(): Record<string, unknown> {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.secure,
      path: '/',
      maxAge: COOKIE_MAX_AGE_MS,
    };
  }

  private csrfCookieOptions(): Record<string, unknown> {
    return {
      httpOnly: false,
      sameSite: 'lax',
      secure: this.secure,
      path: '/',
      maxAge: COOKIE_MAX_AGE_MS,
    };
  }
}
