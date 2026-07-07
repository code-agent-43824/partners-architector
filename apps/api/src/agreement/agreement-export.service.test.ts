import { ExportFormat, ExportKind, Role, SessionKind, SessionStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthUser } from '../auth/auth.types';
import type { PrismaService } from '../prisma/prisma.service';
import { PRINCIPLES } from '../seed/principles';
import { AgreementExportService } from './agreement-export.service';
import type { AgreementService } from './agreement.service';
import type { AgreementDocument } from './agreement.types';
import type { PdfRendererService } from './pdf-renderer.service';

const architect: AuthUser = {
  id: 'arch-1',
  email: 'a@x.io',
  role: Role.architect,
  displayName: null,
};

const emptyDoc: AgreementDocument = {
  partnershipName: 'Кофейня',
  participants: [],
  sessionTitle: null,
  sessionKind: SessionKind.initial,
  sessionStatus: SessionStatus.in_progress,
  assembledAt: new Date().toISOString(),
  summary: { total: 0, applicable: 0, agreed: 0, fullyConfirmed: 0 },
  principles: PRINCIPLES,
  sections: [],
};

describe('AgreementExportService', () => {
  let prisma: { exportRecord: { create: ReturnType<typeof vi.fn> } };
  let assemble: ReturnType<typeof vi.fn>;
  let renderPdf: ReturnType<typeof vi.fn>;
  let service: AgreementExportService;

  beforeEach(() => {
    prisma = { exportRecord: { create: vi.fn().mockResolvedValue({}) } };
    assemble = vi.fn().mockResolvedValue(emptyDoc);
    renderPdf = vi.fn().mockResolvedValue(Buffer.from('%PDF-fake'));
    service = new AgreementExportService(
      prisma as unknown as PrismaService,
      { assemble } as unknown as AgreementService,
      { renderPdf } as unknown as PdfRendererService,
    );
  });

  it('exports PDF via the renderer and logs an export_record', async () => {
    const file = await service.exportPdf(architect, 'p-1', 's-1');
    expect(assemble).toHaveBeenCalledWith(architect, 'p-1', 's-1');
    expect(renderPdf).toHaveBeenCalledOnce();
    expect(file.contentType).toBe('application/pdf');
    expect(file.filename).toMatch(/^agreement-\d{4}-\d{2}-\d{2}\.pdf$/);
    expect(prisma.exportRecord.create).toHaveBeenCalledWith({
      data: {
        sessionId: 's-1',
        kind: ExportKind.agreement,
        format: ExportFormat.pdf,
        filePath: file.filename,
      },
    });
  });

  it('exports DOCX and logs an export_record', async () => {
    const file = await service.exportDocx(architect, 'p-1', 's-1');
    expect(file.buffer.subarray(0, 2).toString('latin1')).toBe('PK');
    expect(file.filename).toMatch(/^agreement-\d{4}-\d{2}-\d{2}\.docx$/);
    expect(prisma.exportRecord.create).toHaveBeenCalledWith({
      data: {
        sessionId: 's-1',
        kind: ExportKind.agreement,
        format: ExportFormat.docx,
        filePath: file.filename,
      },
    });
  });

  it('does not log a record when assembly fails (access denied)', async () => {
    assemble.mockRejectedValue(new Error('forbidden'));
    await expect(service.exportPdf(architect, 'p-1', 's-1')).rejects.toThrow('forbidden');
    expect(prisma.exportRecord.create).not.toHaveBeenCalled();
  });
});
