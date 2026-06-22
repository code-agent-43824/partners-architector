import { Global, Module } from '@nestjs/common';

import { PrismaService } from './prisma.service';

/** Provides the Prisma client application-wide. */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
