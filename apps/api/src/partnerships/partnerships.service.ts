import { Injectable, NotFoundException } from '@nestjs/common';
import { type Partnership, PartnershipStatus, Role } from '@prisma/client';

import type { AuthUser } from '../auth/auth.types';
import { assertCanAccessOwned } from '../common/ownership';
import { PrismaService } from '../prisma/prisma.service';
import type { CreatePartnershipDto, ListPartnershipsQueryDto, UpdatePartnershipDto } from './dto';

@Injectable()
export class PartnershipsService {
  constructor(private readonly prisma: PrismaService) {}

  create(user: AuthUser, dto: CreatePartnershipDto): Promise<Partnership> {
    return this.prisma.partnership.create({
      data: {
        ownerAccountId: user.id,
        name: dto.name,
        typeTags: dto.typeTags ?? [],
        notes: dto.notes ?? null,
      },
    });
  }

  list(user: AuthUser, query: ListPartnershipsQueryDto): Promise<Partnership[]> {
    return this.prisma.partnership.findMany({
      where: {
        // Data isolation (SEC-5): architects see only their own; admin sees all.
        ...(user.role === Role.admin ? {} : { ownerAccountId: user.id }),
        ...(query.status === 'all'
          ? {}
          : {
              status:
                query.status === 'archived' ? PartnershipStatus.archived : PartnershipStatus.active,
            }),
        ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async get(user: AuthUser, id: string): Promise<Partnership> {
    const partnership = await this.prisma.partnership.findUnique({ where: { id } });
    if (!partnership) {
      throw new NotFoundException('Partnership not found');
    }
    assertCanAccessOwned(user, partnership.ownerAccountId);
    return partnership;
  }

  async update(user: AuthUser, id: string, dto: UpdatePartnershipDto): Promise<Partnership> {
    await this.get(user, id); // existence + ownership
    return this.prisma.partnership.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.typeTags !== undefined ? { typeTags: dto.typeTags } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });
  }

  async setStatus(user: AuthUser, id: string, status: PartnershipStatus): Promise<Partnership> {
    await this.get(user, id);
    return this.prisma.partnership.update({ where: { id }, data: { status } });
  }

  async remove(user: AuthUser, id: string): Promise<void> {
    await this.get(user, id);
    await this.prisma.partnership.delete({ where: { id } });
  }
}
