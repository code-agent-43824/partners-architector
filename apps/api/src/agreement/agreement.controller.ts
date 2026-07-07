import { Controller, Get, Header, Param, StreamableFile } from '@nestjs/common';
import { Role } from '@prisma/client';

import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { AgreementExportService, type ExportedFile } from './agreement-export.service';
import { AgreementService } from './agreement.service';

function asDownload(file: ExportedFile): StreamableFile {
  return new StreamableFile(file.buffer, {
    type: file.contentType,
    // Filename is ASCII-safe by construction (agreement-YYYY-MM-DD.ext).
    disposition: `attachment; filename="${file.filename}"`,
  });
}

@Roles(Role.architect, Role.admin)
@Controller('partnerships/:partnershipId/sessions/:sessionId/agreement')
export class AgreementController {
  constructor(
    private readonly agreement: AgreementService,
    private readonly exporter: AgreementExportService,
  ) {}

  @Get()
  assemble(
    @CurrentUser() user: AuthUser,
    @Param('partnershipId') partnershipId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.agreement.assemble(user, partnershipId, sessionId);
  }

  // FR-8.5/DOC-5: generated on the server, streamed to the browser, logged.
  @Get('export/pdf')
  @Header('cache-control', 'no-store')
  async exportPdf(
    @CurrentUser() user: AuthUser,
    @Param('partnershipId') partnershipId: string,
    @Param('sessionId') sessionId: string,
  ): Promise<StreamableFile> {
    return asDownload(await this.exporter.exportPdf(user, partnershipId, sessionId));
  }

  @Get('export/docx')
  @Header('cache-control', 'no-store')
  async exportDocx(
    @CurrentUser() user: AuthUser,
    @Param('partnershipId') partnershipId: string,
    @Param('sessionId') sessionId: string,
  ): Promise<StreamableFile> {
    return asDownload(await this.exporter.exportDocx(user, partnershipId, sessionId));
  }
}
