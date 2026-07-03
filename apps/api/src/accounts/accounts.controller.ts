import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { AccountStatus, Role } from '@prisma/client';
import { z } from 'zod';

import { Roles } from '../auth/roles.decorator';
import { ZodBody } from '../common/zod-validation.pipe';
import { AccountsService } from './accounts.service';
import { type ResetPasswordDto, resetPasswordSchema } from './dto';

const statusSchema = z.object({ status: z.nativeEnum(AccountStatus) });
type StatusDto = z.infer<typeof statusSchema>;

/** Admin-only instance user management (spec FR-1.5). */
@Roles(Role.admin)
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get()
  list() {
    return this.accounts.listArchitects();
  }

  @Patch(':id/status')
  setStatus(@Param('id') id: string, @Body(new ZodBody(statusSchema)) dto: StatusDto) {
    return this.accounts.setStatus(id, dto.status);
  }

  @Patch(':id/password')
  resetPassword(
    @Param('id') id: string,
    @Body(new ZodBody(resetPasswordSchema)) dto: ResetPasswordDto,
  ) {
    return this.accounts.resetPassword(id, dto.password);
  }
}
