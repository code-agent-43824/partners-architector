import { Body, Controller, Get, HttpCode, Param, Patch, Post, Put } from '@nestjs/common';
import { Role } from '@prisma/client';

import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { ZodBody } from '../common/zod-validation.pipe';
import {
  type SaveVersionDto,
  saveVersionSchema,
  type SetSignoffDto,
  setSignoffSchema,
  type UpdateClauseDto,
  updateClauseSchema,
} from './dto';
import { ScenarioService } from './scenario.service';

@Roles(Role.architect, Role.admin)
@Controller('partnerships/:partnershipId/sessions/:sessionId/clauses')
export class ScenarioController {
  constructor(private readonly scenario: ScenarioService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Param('partnershipId') partnershipId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.scenario.listClauses(user, partnershipId, sessionId);
  }

  @Patch(':clauseId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('partnershipId') partnershipId: string,
    @Param('sessionId') sessionId: string,
    @Param('clauseId') clauseId: string,
    @Body(new ZodBody(updateClauseSchema)) dto: UpdateClauseDto,
  ) {
    return this.scenario.updateClause(user, partnershipId, sessionId, clauseId, dto);
  }

  @Put(':clauseId/signoffs/:partnerId')
  setSignoff(
    @CurrentUser() user: AuthUser,
    @Param('partnershipId') partnershipId: string,
    @Param('sessionId') sessionId: string,
    @Param('clauseId') clauseId: string,
    @Param('partnerId') partnerId: string,
    @Body(new ZodBody(setSignoffSchema)) dto: SetSignoffDto,
  ) {
    return this.scenario.setSignoff(user, partnershipId, sessionId, clauseId, partnerId, dto);
  }

  @Get(':clauseId/versions')
  listVersions(
    @CurrentUser() user: AuthUser,
    @Param('partnershipId') partnershipId: string,
    @Param('sessionId') sessionId: string,
    @Param('clauseId') clauseId: string,
  ) {
    return this.scenario.listVersions(user, partnershipId, sessionId, clauseId);
  }

  @Post(':clauseId/versions')
  @HttpCode(201)
  saveVersion(
    @CurrentUser() user: AuthUser,
    @Param('partnershipId') partnershipId: string,
    @Param('sessionId') sessionId: string,
    @Param('clauseId') clauseId: string,
    @Body(new ZodBody(saveVersionSchema)) dto: SaveVersionDto,
  ) {
    return this.scenario.saveVersion(user, partnershipId, sessionId, clauseId, dto);
  }

  @Post(':clauseId/versions/:versionId/restore')
  @HttpCode(200)
  restoreVersion(
    @CurrentUser() user: AuthUser,
    @Param('partnershipId') partnershipId: string,
    @Param('sessionId') sessionId: string,
    @Param('clauseId') clauseId: string,
    @Param('versionId') versionId: string,
  ) {
    return this.scenario.restoreVersion(user, partnershipId, sessionId, clauseId, versionId);
  }
}
