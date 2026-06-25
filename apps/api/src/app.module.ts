import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AccountsModule } from './accounts/accounts.module';
import { AuthModule } from './auth/auth.module';
import { validateEnv } from './config/env';
import { HealthModule } from './health/health.module';
import { PartnersModule } from './partners/partners.module';
import { PartnershipsModule } from './partnerships/partnerships.module';
import { PrismaModule } from './prisma/prisma.module';
import { ScenarioModule } from './scenario/scenario.module';
import { SessionsModule } from './sessions/sessions.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    AuthModule,
    AccountsModule,
    PartnershipsModule,
    PartnersModule,
    SessionsModule,
    ScenarioModule,
    HealthModule,
  ],
})
export class AppModule {}
