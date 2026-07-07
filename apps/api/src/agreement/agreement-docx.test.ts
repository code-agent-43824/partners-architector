import { inflateRawSync } from 'node:zlib';

import { ClauseStatus, SessionKind, SessionStatus } from '@prisma/client';
import { Packer } from 'docx';
import { describe, expect, it } from 'vitest';

import { PRINCIPLES } from '../seed/principles';
import { agreementDocxBuffer, htmlToParagraphs } from './agreement-docx';
import type { AgreementDocument } from './agreement.types';

/** Serialize paragraphs into a docx and return the raw document XML. */
async function paragraphsXml(html: string): Promise<string> {
  const { Document } = await import('docx');
  const doc = new Document({
    numbering: {
      config: [
        {
          reference: 'agreement-ol',
          levels: [{ level: 0, format: 'decimal', text: '%1.' }],
        },
      ],
    },
    sections: [{ children: htmlToParagraphs(html) }],
  });
  const buffer = await Packer.toBuffer(doc);
  return extractDocumentXml(buffer);
}

/** Minimal zip reader: pull word/document.xml out of the docx buffer. */
function extractDocumentXml(buffer: Buffer): string {
  // Walk local file headers (PK\x03\x04) and inflate word/document.xml.
  let offset = 0;
  while (offset < buffer.length - 4) {
    if (buffer.readUInt32LE(offset) !== 0x04034b50) {
      break;
    }
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const name = buffer.subarray(offset + 30, offset + 30 + nameLength).toString('utf8');
    const dataStart = offset + 30 + nameLength + extraLength;
    if (name === 'word/document.xml') {
      const method = buffer.readUInt16LE(offset + 8);
      const data = buffer.subarray(dataStart, dataStart + compressedSize);
      return method === 0 ? data.toString('utf8') : inflateRawSync(data).toString('utf8');
    }
    offset = dataStart + compressedSize;
  }
  throw new Error('word/document.xml not found');
}

describe('htmlToParagraphs', () => {
  it('maps paragraphs with bold/italic/strike runs', async () => {
    const xml = await paragraphsXml(
      '<p>Обычный <strong>жирный</strong> <em>курсив</em> <s>зачёркнутый</s></p>',
    );
    expect(xml).toContain('жирный');
    expect(xml).toContain('<w:b/>');
    expect(xml).toContain('<w:i/>');
    expect(xml).toContain('<w:strike/>');
  });

  it('maps bullet and numbered lists to list paragraphs', async () => {
    const xml = await paragraphsXml('<ul><li>первый</li><li>второй</li></ul><ol><li>раз</li></ol>');
    expect(xml).toContain('первый');
    expect(xml).toContain('раз');
    // Both list kinds produce numbering properties.
    expect((xml.match(/<w:numPr>/g) ?? []).length).toBe(3);
  });

  it('drops nothing textual from unknown wrappers', async () => {
    const xml = await paragraphsXml('<div>внутри блока</div>');
    expect(xml).toContain('внутри блока');
  });
});

describe('agreementDocxBuffer', () => {
  it('produces a valid docx containing the agreement content', async () => {
    const doc: AgreementDocument = {
      partnershipName: 'Кофейня «Третье место»',
      participants: [
        { fullName: 'Иван Петров', role: 'Сооснователь' },
        { fullName: 'Мария Сидорова', role: null },
      ],
      sessionTitle: 'Первичная сессия',
      sessionKind: SessionKind.initial,
      sessionStatus: SessionStatus.in_progress,
      assembledAt: new Date('2026-07-07T12:00:00Z').toISOString(),
      summary: { total: 2, applicable: 2, agreed: 1, fullyConfirmed: 1 },
      principles: PRINCIPLES,
      sections: [
        {
          number: 5,
          title: 'Как партнёры распределят доли',
          category: 'Доли',
          isSensitive: true,
          status: ClauseStatus.agreed,
          text: '<p>Доли <strong>зафиксированы</strong>.</p><script>alert(1)</script>',
          rationale: 'По вкладу капиталов',
          naReason: null,
          signoffs: [
            { partnerName: 'Иван Петров', agreed: true },
            { partnerName: 'Мария Сидорова', agreed: true },
          ],
          shares: {
            allocations: [
              { partnerName: 'Иван Петров', percent: 60 },
              { partnerName: 'Мария Сидорова', percent: 40 },
            ],
            total: 100,
          },
          meaning: null,
        },
        {
          number: 12,
          title: 'Когда партнёры могут отдыхать',
          category: 'Операционный контур',
          isSensitive: false,
          status: ClauseStatus.not_applicable,
          text: null,
          rationale: null,
          naReason: 'Не наш случай',
          signoffs: [],
          shares: null,
          meaning: null,
        },
      ],
    };

    const buffer = await agreementDocxBuffer(doc);
    // docx = zip: PK magic.
    expect(buffer.subarray(0, 2).toString('latin1')).toBe('PK');

    const xml = extractDocumentXml(buffer);
    expect(xml).toContain('Партнёрское соглашение');
    expect(xml).toContain('Кофейня «Третье место»');
    expect(xml).toContain('зафиксированы');
    expect(xml).not.toContain('alert(1)'); // sanitized before mapping
    expect(xml).toContain('Итого');
    expect(xml).toContain('Неактуально: Не наш случай');
    expect(xml).toContain(PRINCIPLES[0]!.title.slice(0, 25));
  });
});
