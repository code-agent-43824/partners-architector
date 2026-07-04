import { Controller, Get, Param } from '@nestjs/common';
import { Role } from '@prisma/client';

import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { AgreementService } from './agreement.service';

@Roles(Role.architect, Role.admin)
@Controller('partnerships/:partnershipId/sessions/:sessionId/agreement')
export class AgreementController {
  constructor(private readonly agreement: AgreementService) {}

  @Get()
  assemble(
    @CurrentUser() user: AuthUser,
    @Param('partnershipId') partnershipId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.agreement.assemble(user, partnershipId, sessionId);
  }
}
