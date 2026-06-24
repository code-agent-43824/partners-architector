import { Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import { Role } from '@prisma/client';

import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { ZodBody } from '../common/zod-validation.pipe';
import { type CreateSessionDto, createSessionSchema } from './dto';
import { SessionsService } from './sessions.service';

@Roles(Role.architect, Role.admin)
@Controller('partnerships/:partnershipId/sessions')
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Param('partnershipId') partnershipId: string) {
    return this.sessions.list(user, partnershipId);
  }

  @Post()
  @HttpCode(201)
  create(
    @CurrentUser() user: AuthUser,
    @Param('partnershipId') partnershipId: string,
    @Body(new ZodBody(createSessionSchema)) dto: CreateSessionDto,
  ) {
    return this.sessions.create(user, partnershipId, dto);
  }

  @Get(':sessionId')
  get(
    @CurrentUser() user: AuthUser,
    @Param('partnershipId') partnershipId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.sessions.get(user, partnershipId, sessionId);
  }

  @Post(':sessionId/start')
  @HttpCode(200)
  start(
    @CurrentUser() user: AuthUser,
    @Param('partnershipId') partnershipId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.sessions.start(user, partnershipId, sessionId);
  }

  @Post(':sessionId/complete')
  @HttpCode(200)
  complete(
    @CurrentUser() user: AuthUser,
    @Param('partnershipId') partnershipId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.sessions.complete(user, partnershipId, sessionId);
  }

  @Delete(':sessionId')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('partnershipId') partnershipId: string,
    @Param('sessionId') sessionId: string,
  ): Promise<void> {
    await this.sessions.remove(user, partnershipId, sessionId);
  }
}
