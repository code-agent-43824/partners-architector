import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Partner } from '@prisma/client';

import type { AuthUser } from '../auth/auth.types';
import { assertCanAccessOwned } from '../common/ownership';
import { PrismaService } from '../prisma/prisma.service';
import {
  type CreatePartnerDto,
  MAX_PARTNERS,
  type ReorderPartnersDto,
  type UpdatePartnerDto,
} from './dto';

/**
 * Partners are scoped through their partnership's owner (SEC-5): every method
 * first resolves the parent partnership and checks ownership, so an architect
 * can only touch partners of their own partnerships (admin is unrestricted).
 */
@Injectable()
export class PartnersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser, partnershipId: string): Promise<Partner[]> {
    await this.assertPartnershipAccess(user, partnershipId);
    return this.prisma.partner.findMany({
      where: { partnershipId },
      orderBy: { orderIndex: 'asc' },
    });
  }

  async add(user: AuthUser, partnershipId: string, dto: CreatePartnerDto): Promise<Partner> {
    await this.assertPartnershipAccess(user, partnershipId);
    const count = await this.prisma.partner.count({ where: { partnershipId } });
    if (count >= MAX_PARTNERS) {
      throw new ConflictException(`A partnership may have at most ${MAX_PARTNERS} partners`);
    }
    // Append after the current last position; gaps are harmless (we always
    // order by orderIndex, and reorder re-packs to 0..n-1).
    const last = await this.prisma.partner.findFirst({
      where: { partnershipId },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });
    return this.prisma.partner.create({
      data: {
        partnershipId,
        fullName: dto.fullName,
        role: dto.role ?? null,
        contact: dto.contact ?? null,
        orderIndex: last ? last.orderIndex + 1 : 0,
      },
    });
  }

  async update(
    user: AuthUser,
    partnershipId: string,
    partnerId: string,
    dto: UpdatePartnerDto,
  ): Promise<Partner> {
    await this.assertPartnershipAccess(user, partnershipId);
    await this.getOwnedPartner(partnershipId, partnerId);
    return this.prisma.partner.update({
      where: { id: partnerId },
      data: {
        ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
        ...(dto.role !== undefined ? { role: dto.role } : {}),
        ...(dto.contact !== undefined ? { contact: dto.contact } : {}),
      },
    });
  }

  async remove(user: AuthUser, partnershipId: string, partnerId: string): Promise<void> {
    await this.assertPartnershipAccess(user, partnershipId);
    await this.getOwnedPartner(partnershipId, partnerId);
    await this.prisma.partner.delete({ where: { id: partnerId } });
  }

  async reorder(
    user: AuthUser,
    partnershipId: string,
    dto: ReorderPartnersDto,
  ): Promise<Partner[]> {
    await this.assertPartnershipAccess(user, partnershipId);
    const existing = await this.prisma.partner.findMany({
      where: { partnershipId },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((partner) => partner.id));
    const isPermutation =
      new Set(dto.ids).size === dto.ids.length &&
      dto.ids.length === existingIds.size &&
      dto.ids.every((id) => existingIds.has(id));
    if (!isPermutation) {
      throw new BadRequestException(
        'Reorder must list exactly the current partners, without duplicates',
      );
    }
    await this.prisma.$transaction(
      dto.ids.map((id, index) =>
        this.prisma.partner.update({ where: { id }, data: { orderIndex: index } }),
      ),
    );
    return this.prisma.partner.findMany({
      where: { partnershipId },
      orderBy: { orderIndex: 'asc' },
    });
  }

  private async assertPartnershipAccess(user: AuthUser, partnershipId: string): Promise<void> {
    const partnership = await this.prisma.partnership.findUnique({
      where: { id: partnershipId },
      select: { ownerAccountId: true },
    });
    if (!partnership) {
      throw new NotFoundException('Partnership not found');
    }
    assertCanAccessOwned(user, partnership.ownerAccountId);
  }

  private async getOwnedPartner(partnershipId: string, partnerId: string): Promise<Partner> {
    const partner = await this.prisma.partner.findUnique({ where: { id: partnerId } });
    if (!partner || partner.partnershipId !== partnershipId) {
      throw new NotFoundException('Partner not found');
    }
    return partner;
  }
}
