import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { pingDatabase } from './ping-database';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  /** Process liveness — does not touch the database. */
  liveness(): { status: 'ok'; uptime: number } {
    return { status: 'ok', uptime: process.uptime() };
  }

  /** Database readiness probe. */
  async database(): Promise<boolean> {
    return pingDatabase(this.prisma);
  }
}
