import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import type { AuthUser } from '../auth/auth.types';
import { assertCanAccessOwned } from '../common/ownership';
import { PrismaService } from '../prisma/prisma.service';
import {
  MAX_TEST_IMPORT_BYTES,
  parsePespFile,
  type PespConstruct,
  type TestImportPayload,
  type UpdateZonesDto,
} from './dto';

/** Uploaded file as delivered by multer's memory storage. */
export interface UploadedTestFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

/** API shape of an import: everything except the raw file bytes. */
const importSelect = {
  id: true,
  partnershipId: true,
  fileName: true,
  mimeType: true,
  sizeBytes: true,
  status: true,
  payload: true,
  uploadedAt: true,
} satisfies Prisma.TestImportSelect;

export type TestImportView = Prisma.TestImportGetPayload<{ select: typeof importSelect }>;

/**
 * Compatibility-test result imports (D9). Scoped through the partnership's
 * owner (SEC-5) like every partnership child resource. The raw file is
 * stored so unrecognized reports can be re-parsed once the official ПЕСП
 * export format is known; responses never include the bytes.
 */
@Injectable()
export class TestImportService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser, partnershipId: string): Promise<TestImportView[]> {
    await this.assertPartnershipAccess(user, partnershipId);
    return this.prisma.testImport.findMany({
      where: { partnershipId },
      orderBy: { uploadedAt: 'desc' },
      select: importSelect,
    });
  }

  async create(
    user: AuthUser,
    partnershipId: string,
    file: UploadedTestFile,
  ): Promise<TestImportView> {
    await this.assertPartnershipAccess(user, partnershipId);
    if (file.size === 0 || file.buffer.length === 0) {
      throw new BadRequestException('Uploaded file is empty');
    }
    if (file.buffer.length > MAX_TEST_IMPORT_BYTES) {
      throw new BadRequestException('Uploaded file is too large');
    }
    const parsed = parsePespFile(file.buffer);
    const payload: TestImportPayload | undefined = parsed
      ? {
          source: 'file',
          partners: parsed.partners,
          score: parsed.score,
          level: parsed.level,
          constructs: parsed.constructs,
        }
      : undefined;
    return this.prisma.testImport.create({
      data: {
        partnershipId,
        fileName: sanitizeFileName(file.originalname),
        mimeType: file.mimetype || 'application/octet-stream',
        sizeBytes: file.buffer.length,
        data: new Uint8Array(file.buffer),
        status: parsed ? 'parsed' : 'received',
        payload: payload as unknown as Prisma.InputJsonValue | undefined,
      },
      select: importSelect,
    });
  }

  /**
   * Replaces the effective zone marking. Partner score `values` (and the
   * report's partners/score/level) survive from the previously parsed
   * payload for construct codes that are still marked; the raw file keeps
   * the untouched original either way.
   */
  async updateZones(
    user: AuthUser,
    partnershipId: string,
    importId: string,
    dto: UpdateZonesDto,
  ): Promise<TestImportView> {
    const existing = await this.getOwnedImport(user, partnershipId, importId);
    const previous = (existing.payload ?? undefined) as TestImportPayload | undefined;
    const previousByCode = new Map<string, PespConstruct>(
      (previous?.constructs ?? []).map((construct) => [construct.code, construct]),
    );
    const constructs: PespConstruct[] = dto.constructs.map((entry) => {
      const before = previousByCode.get(entry.code);
      return {
        code: entry.code,
        name: entry.name ?? before?.name ?? entry.code,
        block: before?.block,
        zone: entry.zone,
        values: before?.values,
      };
    });
    const payload: TestImportPayload = {
      source: previous && previous.source !== 'manual' ? 'file+manual' : 'manual',
      partners: previous?.partners,
      score: previous?.score,
      level: previous?.level,
      constructs,
    };
    return this.prisma.testImport.update({
      where: { id: importId },
      data: { payload: payload as unknown as Prisma.InputJsonValue },
      select: importSelect,
    });
  }

  async remove(user: AuthUser, partnershipId: string, importId: string): Promise<void> {
    await this.getOwnedImport(user, partnershipId, importId);
    await this.prisma.testImport.delete({ where: { id: importId } });
  }

  private async assertPartnershipAccess(user: AuthUser, partnershipId: string): Promise<void> {
    const partnership = await this.prisma.partnership.findUnique({
      where: { id: partnershipId },
      select: { ownerAccountId: true },
    });
    if (!partnership) {
      throw new NotFoundException('Partnership not found');
    }
    assertCanAccessOwned(user, partnership.ownerAccountId);
  }

  private async getOwnedImport(
    user: AuthUser,
    partnershipId: string,
    importId: string,
  ): Promise<TestImportView> {
    await this.assertPartnershipAccess(user, partnershipId);
    const record = await this.prisma.testImport.findUnique({
      where: { id: importId },
      select: importSelect,
    });
    if (!record || record.partnershipId !== partnershipId) {
      throw new NotFoundException('Test import not found');
    }
    return record;
  }
}

/** Keeps the stored display name harmless: no path separators or controls. */
function sanitizeFileName(name: string): string {
  // eslint-disable-next-line no-control-regex
  const cleaned = name.replace(/[\\/\u0000-\u001f\u007f]/g, '').trim();
  return cleaned.slice(0, 200) || 'отчёт';
}
