import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { Role } from '@prisma/client';

import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { ZodBody } from '../common/zod-validation.pipe';
import { type UpdateClauseStatusDto, updateClauseStatusSchema } from './dto';
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
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('partnershipId') partnershipId: string,
    @Param('sessionId') sessionId: string,
    @Param('clauseId') clauseId: string,
    @Body(new ZodBody(updateClauseStatusSchema)) dto: UpdateClauseStatusDto,
  ) {
    return this.scenario.updateStatus(user, partnershipId, sessionId, clauseId, dto);
  }
}
