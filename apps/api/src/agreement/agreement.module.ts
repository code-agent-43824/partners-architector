import { Module } from '@nestjs/common';

import { AgreementExportService } from './agreement-export.service';
import { AgreementController } from './agreement.controller';
import { AgreementService } from './agreement.service';
import { PdfRendererService } from './pdf-renderer.service';

@Module({
  controllers: [AgreementController],
  providers: [AgreementService, AgreementExportService, PdfRendererService],
})
export class AgreementModule {}
