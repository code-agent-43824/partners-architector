import { Injectable } from '@nestjs/common';
import { ExportFormat, ExportKind } from '@prisma/client';

import type { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { agreementDocxBuffer } from './agreement-docx';
import { renderAgreementHtml } from './agreement-html';
import { AgreementService } from './agreement.service';
import { PdfRendererService } from './pdf-renderer.service';

export interface ExportedFile {
  buffer: Buffer;
  /** ASCII-safe filename used in Content-Disposition and export_record. */
  filename: string;
  contentType: string;
}

/**
 * Server-side agreement export (FR-8.5, DOC-5): assemble (ownership enforced
 * by AgreementService), render to PDF (headless Chromium) or DOCX, and log an
 * `export_record` row per successful export. MVP streams the file to the
 * browser without retaining it server-side (`file_path` stores the served
 * filename); Phase 6's client portal adds persistent artifact storage.
 */
@Injectable()
export class AgreementExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly agreement: AgreementService,
    private readonly pdfRenderer: PdfRendererService,
  ) {}

  private filename(format: ExportFormat): string {
    const date = new Date().toISOString().slice(0, 10);
    return `agreement-${date}.${format}`;
  }

  async exportPdf(user: AuthUser, partnershipId: string, sessionId: string): Promise<ExportedFile> {
    const doc = await this.agreement.assemble(user, partnershipId, sessionId);
    const buffer = await this.pdfRenderer.renderPdf(renderAgreementHtml(doc));
    const filename = this.filename(ExportFormat.pdf);
    await this.record(sessionId, ExportFormat.pdf, filename);
    return { buffer, filename, contentType: 'application/pdf' };
  }

  async exportDocx(
    user: AuthUser,
    partnershipId: string,
    sessionId: string,
  ): Promise<ExportedFile> {
    const doc = await this.agreement.assemble(user, partnershipId, sessionId);
    const buffer = await agreementDocxBuffer(doc);
    const filename = this.filename(ExportFormat.docx);
    await this.record(sessionId, ExportFormat.docx, filename);
    return {
      buffer,
      filename,
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
  }

  private async record(sessionId: string, format: ExportFormat, filename: string): Promise<void> {
    await this.prisma.exportRecord.create({
      data: { sessionId, kind: ExportKind.agreement, format, filePath: filename },
    });
  }
}
