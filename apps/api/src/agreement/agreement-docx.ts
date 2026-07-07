import { ClauseStatus } from '@prisma/client';
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { parseDocument } from 'htmlparser2';

import { sanitizeClauseHtml } from '../scenario/html-sanitizer';
import type { AgreementDocument, AgreementSection } from './agreement.types';

/**
 * Minimal structural view of htmlparser2's DOM nodes (from `domhandler`),
 * kept local so we don't depend on domhandler's types directly.
 */
interface DomNode {
  type: string;
  data?: string; // text nodes
  name?: string; // elements
  children?: DomNode[];
}

function isText(node: DomNode): boolean {
  return node.type === 'text' && typeof node.data === 'string';
}

function isElement(node: DomNode): boolean {
  return typeof node.name === 'string' && Array.isArray(node.children);
}

/**
 * DOCX rendering of the assembled agreement (`docx` is pure JS — no browser).
 * The DOCX is the post-editable deliverable (architects polish it), so TipTap
 * formatting is preserved (DOC-4): bold/italic/strike runs, bullet and
 * numbered lists, headings. Formulation HTML is sanitized first (same W5
 * allowlist), then mapped via htmlparser2's DOM.
 */

const NUMBERING_REF = 'agreement-ol';

const STATUS_LABELS: Record<ClauseStatus, string> = {
  [ClauseStatus.not_started]: 'не начат',
  [ClauseStatus.in_progress]: 'в работе',
  [ClauseStatus.parked]: 'отложен',
  [ClauseStatus.agreed]: 'согласовано',
  [ClauseStatus.disputed]: 'спор',
  [ClauseStatus.not_applicable]: 'неактуально',
};

interface RunStyle {
  bold?: boolean;
  italics?: boolean;
  strike?: boolean;
  code?: boolean;
}

function textRuns(nodes: DomNode[], style: RunStyle): TextRun[] {
  const runs: TextRun[] = [];
  for (const node of nodes) {
    if (isText(node)) {
      const text = (node.data ?? '').replace(/\s+/g, ' ');
      if (text) {
        runs.push(
          new TextRun({
            text,
            bold: style.bold,
            italics: style.italics,
            strike: style.strike,
            font: style.code ? 'Courier New' : undefined,
          }),
        );
      }
      continue;
    }
    if (!isElement(node)) {
      continue;
    }
    if (node.name === 'br') {
      runs.push(new TextRun({ break: 1 }));
      continue;
    }
    const next: RunStyle = {
      bold: style.bold || node.name === 'strong' || node.name === 'b',
      italics: style.italics || node.name === 'em' || node.name === 'i',
      strike: style.strike || node.name === 's',
      code: style.code || node.name === 'code',
    };
    runs.push(...textRuns(node.children ?? [], next));
  }
  return runs;
}

/** Map sanitized TipTap HTML to docx paragraphs (blocks: p, lists, h1-3, blockquote, pre). */
export function htmlToParagraphs(html: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const dom = parseDocument(html) as unknown as { children: DomNode[] };

  function walkBlocks(nodes: DomNode[]): void {
    for (const node of nodes) {
      if (isText(node)) {
        const text = (node.data ?? '').trim();
        if (text) {
          paragraphs.push(new Paragraph({ children: [new TextRun(text)] }));
        }
        continue;
      }
      if (!isElement(node)) {
        continue;
      }
      const children = node.children ?? [];
      switch (node.name) {
        case 'p':
          paragraphs.push(new Paragraph({ children: textRuns(children, {}) }));
          break;
        case 'h1':
        case 'h2':
        case 'h3':
          paragraphs.push(
            new Paragraph({
              heading: HeadingLevel.HEADING_4,
              children: textRuns(children, { bold: true }),
            }),
          );
          break;
        case 'ul':
        case 'ol': {
          for (const item of children) {
            if (item.name !== 'li') {
              continue;
            }
            paragraphs.push(
              new Paragraph({
                children: textRuns(item.children ?? [], {}),
                ...(node.name === 'ul'
                  ? { bullet: { level: 0 } }
                  : { numbering: { reference: NUMBERING_REF, level: 0 } }),
              }),
            );
          }
          break;
        }
        case 'blockquote':
          paragraphs.push(
            new Paragraph({
              children: textRuns(children, { italics: true }),
              indent: { left: 567 }, // 1 cm in twips
            }),
          );
          break;
        case 'pre':
          paragraphs.push(new Paragraph({ children: textRuns(children, { code: true }) }));
          break;
        default:
          walkBlocks(children);
      }
    }
  }

  walkBlocks(dom.children);
  return paragraphs;
}

function meta(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 17, color: '666666' })],
    spacing: { after: 80 },
  });
}

function sharesTable(section: AgreementSection): Table {
  const rows = (section.shares?.allocations ?? []).map(
    (a) =>
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(a.partnerName)] }),
          new TableCell({
            children: [
              new Paragraph({
                text: `${Math.round(a.percent * 100) / 100}%`,
                alignment: AlignmentType.RIGHT,
              }),
            ],
          }),
        ],
      }),
  );
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: 'Итого', bold: true })] })],
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: `${Math.round((section.shares?.total ?? 0) * 100) / 100}%`,
                  bold: true,
                }),
              ],
              alignment: AlignmentType.RIGHT,
            }),
          ],
        }),
      ],
    }),
  );
  return new Table({ rows, width: { size: 50, type: WidthType.PERCENTAGE } });
}

function sectionChildren(section: AgreementSection): (Paragraph | Table)[] {
  const children: (Paragraph | Table)[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 40 },
      children: [new TextRun(`${section.number}. ${section.title}`)],
    }),
    meta(
      `${section.category}${section.isSensitive ? ' · тяжёлый вопрос' : ''} · ${STATUS_LABELS[section.status]}`,
    ),
  ];

  if (section.status === ClauseStatus.not_applicable) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Неактуально${section.naReason ? `: ${section.naReason}` : ''}`,
            italics: true,
          }),
        ],
      }),
    );
    return children;
  }

  const safeText = section.text ? sanitizeClauseHtml(section.text) : '';
  if (safeText.trim()) {
    children.push(...htmlToParagraphs(safeText));
  } else {
    children.push(
      new Paragraph({ children: [new TextRun({ text: '— не заполнено', color: '666666' })] }),
    );
  }

  if (section.rationale) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `Мотивация: ${section.rationale}`, italics: true })],
      }),
    );
  }

  if (section.shares) {
    children.push(sharesTable(section));
  }

  if (section.meaning) {
    const flags = [
      section.meaning.voting ? 'голосование' : null,
      section.meaning.profit ? 'прибыль' : null,
      section.meaning.ownership ? 'владение' : null,
      section.meaning.losses ? 'убытки' : null,
    ].filter((f): f is string => f !== null);
    children.push(
      new Paragraph(`Смысл долей: ${flags.length > 0 ? flags.join(', ') : 'не указано'}`),
    );
  }

  if (section.signoffs.length > 0) {
    const signed = section.signoffs.filter((s) => s.agreed).map((s) => s.partnerName);
    const line =
      signed.length === section.signoffs.length
        ? 'Подтверждено всеми партнёрами'
        : signed.length > 0
          ? `Подтвердили: ${signed.join(', ')}`
          : 'Не подтверждено';
    children.push(meta(line));
  }

  return children;
}

export function buildAgreementDocx(doc: AgreementDocument): Document {
  const participants =
    doc.participants.length > 0
      ? doc.participants.map((p) => (p.role ? `${p.fullName} (${p.role})` : p.fullName)).join(', ')
      : '—';
  const assembledDate = new Date(doc.assembledAt).toLocaleDateString('ru-RU');

  const children: (Paragraph | Table)[] = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [new TextRun('Партнёрское соглашение')],
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 120 },
      children: [new TextRun(doc.partnershipName)],
    }),
    ...(doc.sessionTitle
      ? [new Paragraph({ children: [new TextRun({ text: doc.sessionTitle, italics: true })] })]
      : []),
    new Paragraph(`Участники: ${participants}`),
    new Paragraph(`Дата сборки: ${assembledDate}`),
    new Paragraph(
      `Готовность: согласовано ${doc.summary.agreed}/${doc.summary.applicable} · подтверждено всеми: ${doc.summary.fullyConfirmed}`,
    ),
    ...(doc.sessionStatus !== 'completed'
      ? [
          new Paragraph({
            children: [
              new TextRun({
                text: 'Черновик: сессия не завершена — формулировки ещё могут измениться.',
                italics: true,
                color: '8a6d00',
              }),
            ],
          }),
        ]
      : []),
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 240 },
      children: [new TextRun('Принципы партнёрского соглашения')],
    }),
    ...doc.principles.flatMap((p, index) => [
      new Paragraph({
        children: [
          new TextRun({ text: `${index + 1}. ${p.title} `, bold: true }),
          new TextRun(p.body),
        ],
        spacing: { after: 80 },
      }),
    ]),
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 240 },
      children: [new TextRun('Договорённости')],
    }),
    ...doc.sections.flatMap(sectionChildren),
  ];

  return new Document({
    numbering: {
      config: [
        {
          reference: NUMBERING_REF,
          levels: [
            {
              level: 0,
              format: 'decimal',
              text: '%1.',
              alignment: AlignmentType.START,
            },
          ],
        },
      ],
    },
    styles: {
      default: {
        document: { run: { font: 'Liberation Serif', size: 22 } }, // 11pt
      },
    },
    sections: [{ children }],
  });
}

export async function agreementDocxBuffer(doc: AgreementDocument): Promise<Buffer> {
  return Packer.toBuffer(buildAgreementDocx(doc));
}
