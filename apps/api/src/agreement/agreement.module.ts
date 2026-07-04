import { Module } from '@nestjs/common';

import { AgreementController } from './agreement.controller';
import { AgreementService } from './agreement.service';

@Module({
  controllers: [AgreementController],
  providers: [AgreementService],
})
export class AgreementModule {}
