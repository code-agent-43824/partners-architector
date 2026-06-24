import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { Role } from '@prisma/client';

import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { ZodBody } from '../common/zod-validation.pipe';
import {
  type CreatePartnerDto,
  createPartnerSchema,
  type ReorderPartnersDto,
  reorderPartnersSchema,
  type UpdatePartnerDto,
  updatePartnerSchema,
} from './dto';
import { PartnersService } from './partners.service';

@Roles(Role.architect, Role.admin)
@Controller('partnerships/:partnershipId/partners')
export class PartnersController {
  constructor(private readonly partners: PartnersService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Param('partnershipId') partnershipId: string) {
    return this.partners.list(user, partnershipId);
  }

  @Post()
  @HttpCode(201)
  add(
    @CurrentUser() user: AuthUser,
    @Param('partnershipId') partnershipId: string,
    @Body(new ZodBody(createPartnerSchema)) dto: CreatePartnerDto,
  ) {
    return this.partners.add(user, partnershipId, dto);
  }

  @Post('reorder')
  @HttpCode(200)
  reorder(
    @CurrentUser() user: AuthUser,
    @Param('partnershipId') partnershipId: string,
    @Body(new ZodBody(reorderPartnersSchema)) dto: ReorderPartnersDto,
  ) {
    return this.partners.reorder(user, partnershipId, dto);
  }

  @Patch(':partnerId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('partnershipId') partnershipId: string,
    @Param('partnerId') partnerId: string,
    @Body(new ZodBody(updatePartnerSchema)) dto: UpdatePartnerDto,
  ) {
    return this.partners.update(user, partnershipId, partnerId, dto);
  }

  @Delete(':partnerId')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('partnershipId') partnershipId: string,
    @Param('partnerId') partnerId: string,
  ): Promise<void> {
    await this.partners.remove(user, partnershipId, partnerId);
  }
}
