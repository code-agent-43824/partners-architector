import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';

import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  /** Liveness: 200 while the process is up. */
  @Get()
  liveness(): { status: 'ok'; uptime: number } {
    return this.health.liveness();
  }

  /** Readiness: 200 when the database is reachable, 503 otherwise. */
  @Get('db')
  async database(): Promise<{ status: 'ok' }> {
    const ok = await this.health.database();
    if (!ok) {
      throw new ServiceUnavailableException({ status: 'error', database: 'unreachable' });
    }
    return { status: 'ok' };
  }
}
