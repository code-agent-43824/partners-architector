import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { PartnershipStatus, Role } from '@prisma/client';

import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { ZodBody } from '../common/zod-validation.pipe';
import {
  type CreatePartnershipDto,
  createPartnershipSchema,
  type ListPartnershipsQueryDto,
  listPartnershipsQuerySchema,
  type UpdatePartnershipDto,
  updatePartnershipSchema,
} from './dto';
import { PartnershipsService } from './partnerships.service';

@Roles(Role.architect, Role.admin)
@Controller('partnerships')
export class PartnershipsController {
  constructor(private readonly partnerships: PartnershipsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query(new ZodBody(listPartnershipsQuerySchema)) query: ListPartnershipsQueryDto,
  ) {
    return this.partnerships.list(user, query);
  }

  @Post()
  @HttpCode(201)
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodBody(createPartnershipSchema)) dto: CreatePartnershipDto,
  ) {
    return this.partnerships.create(user, dto);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.partnerships.get(user, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodBody(updatePartnershipSchema)) dto: UpdatePartnershipDto,
  ) {
    return this.partnerships.update(user, id, dto);
  }

  @Post(':id/archive')
  @HttpCode(200)
  archive(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.partnerships.setStatus(user, id, PartnershipStatus.archived);
  }

  @Post(':id/restore')
  @HttpCode(200)
  restore(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.partnerships.setStatus(user, id, PartnershipStatus.active);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> {
    await this.partnerships.remove(user, id);
  }
}
