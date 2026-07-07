import { ClauseStatus } from '@prisma/client';

import { sanitizeClauseHtml } from '../scenario/html-sanitizer';
import type { AgreementDocument, AgreementSection } from './agreement.types';

/**
 * Standalone HTML rendering of the assembled agreement for the PDF export
 * (DOC-1, DOC-3 neutral professional template). Pure function: everything is
 * inlined (no external assets — the render context is offline), every plain
 * text field is escaped, and stored formulation HTML is passed through the
 * same allowlist sanitizer that guards writes (defense in depth for rows
 * written before W5 or restored from old versions).
 *
 * Font stack: DejaVu Serif / Liberation Serif — installed in the api image
 * (DOC-4: full Cyrillic coverage; Chromium embeds the used fonts in the PDF).
 */

const STATUS_LABELS: Record<ClauseStatus, string> = {
  [ClauseStatus.not_started]: 'не начат',
  [ClauseStatus.in_progress]: 'в работе',
  [ClauseStatus.parked]: 'отложен',
  [ClauseStatus.agreed]: 'согласовано',
  [ClauseStatus.disputed]: 'спор',
  [ClauseStatus.not_applicable]: 'неактуально',
};

const KIND_LABELS: Record<string, string> = {
  initial: 'первичная сессия',
  review: 'сессия актуализации',
};

const SESSION_STATUS_LABELS: Record<string, string> = {
  draft: 'черновик',
  in_progress: 'в работе',
  completed: 'завершена',
};

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function sectionHtml(section: AgreementSection): string {
  const parts: string[] = [];
  parts.push(`<h3>${section.number}. ${escapeHtml(section.title)}</h3>`);
  parts.push(
    `<p class="meta">${escapeHtml(section.category)}${
      section.isSensitive ? ' · тяжёлый вопрос' : ''
    } · ${STATUS_LABELS[section.status]}</p>`,
  );

  if (section.status === ClauseStatus.not_applicable) {
    parts.push(
      `<p class="na">Неактуально${section.naReason ? `: ${escapeHtml(section.naReason)}` : ''}</p>`,
    );
    return `<section>${parts.join('')}</section>`;
  }

  const safeText = section.text ? sanitizeClauseHtml(section.text) : '';
  if (safeText.trim()) {
    parts.push(`<div class="formulation">${safeText}</div>`);
  } else {
    parts.push('<p class="empty">— не заполнено</p>');
  }

  if (section.rationale) {
    parts.push(`<p class="rationale"><em>Мотивация: ${escapeHtml(section.rationale)}</em></p>`);
  }

  if (section.shares) {
    const rows = section.shares.allocations
      .map(
        (a) =>
          `<tr><td>${escapeHtml(a.partnerName)}</td><td class="pct">${round(a.percent)}%</td></tr>`,
      )
      .join('');
    parts.push(
      `<table class="shares"><tbody>${rows}<tr class="total"><td>Итого</td><td class="pct">${round(
        section.shares.total,
      )}%</td></tr></tbody></table>`,
    );
  }

  if (section.meaning) {
    const flags = [
      section.meaning.voting ? 'голосование' : null,
      section.meaning.profit ? 'прибыль' : null,
      section.meaning.ownership ? 'владение' : null,
      section.meaning.losses ? 'убытки' : null,
    ].filter((f): f is string => f !== null);
    parts.push(
      `<p class="meaning">Смысл долей: ${flags.length > 0 ? flags.join(', ') : 'не указано'}</p>`,
    );
  }

  if (section.signoffs.length > 0) {
    const signed = section.signoffs.filter((s) => s.agreed).map((s) => s.partnerName);
    const line =
      signed.length === section.signoffs.length
        ? '✓ Подтверждено всеми партнёрами'
        : signed.length > 0
          ? `Подтвердили: ${signed.map(escapeHtml).join(', ')}`
          : 'Не подтверждено';
    parts.push(`<p class="signoff">${line}</p>`);
  }

  return `<section>${parts.join('')}</section>`;
}

export function renderAgreementHtml(doc: AgreementDocument): string {
  const participants =
    doc.participants.length > 0
      ? doc.participants
          .map((p) =>
            p.role ? `${escapeHtml(p.fullName)} (${escapeHtml(p.role)})` : escapeHtml(p.fullName),
          )
          .join(', ')
      : '—';
  const assembledDate = new Date(doc.assembledAt).toLocaleDateString('ru-RU');
  const principles = doc.principles
    .map((p) => `<li><strong>${escapeHtml(p.title)}</strong> ${escapeHtml(p.body)}</li>`)
    .join('');
  const sections = doc.sections.map(sectionHtml).join('');
  const draftNote =
    doc.sessionStatus !== 'completed'
      ? '<p class="draft">Черновик: сессия не завершена — формулировки ещё могут измениться.</p>'
      : '';

  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Партнёрское соглашение — ${escapeHtml(doc.partnershipName)}</title>
<style>
  body { font-family: 'DejaVu Serif', 'Liberation Serif', Georgia, serif; color: #111; font-size: 11pt; line-height: 1.5; margin: 0; }
  h1 { font-size: 20pt; margin: 4pt 0 8pt; }
  h2 { font-size: 14pt; margin: 18pt 0 6pt; }
  h3 { font-size: 12pt; margin: 0 0 2pt; }
  .kicker { font-size: 9pt; letter-spacing: 0.08em; text-transform: uppercase; color: #555; margin: 0; }
  .subtitle { font-style: italic; color: #333; margin: 0 0 10pt; }
  .head-meta { width: 100%; border-collapse: collapse; margin: 10pt 0; font-size: 10pt; }
  .head-meta td { border-top: 0.5pt solid #bbb; border-bottom: 0.5pt solid #bbb; padding: 4pt 8pt 4pt 0; vertical-align: top; }
  .head-meta .label { width: 30%; text-transform: uppercase; font-size: 8pt; letter-spacing: 0.05em; color: #555; }
  .draft { background: #f6ecd0; color: #6b4d00; padding: 6pt 8pt; font-size: 10pt; }
  ol.principles { margin: 0; padding-left: 14pt; }
  ol.principles li { margin-bottom: 6pt; }
  section { border-top: 0.5pt solid #ddd; padding-top: 8pt; margin: 10pt 0; break-inside: avoid; }
  section .meta { font-size: 8.5pt; color: #666; margin: 0 0 4pt; }
  .formulation p { margin: 0 0 5pt; }
  .formulation ul, .formulation ol { margin: 0 0 5pt; padding-left: 14pt; }
  .empty, .na { color: #666; margin: 0 0 4pt; }
  .rationale { color: #333; margin: 2pt 0; }
  .meaning { margin: 2pt 0; }
  .signoff { font-size: 9.5pt; color: #555; margin: 4pt 0 0; }
  table.shares { border-collapse: collapse; margin: 4pt 0; min-width: 45%; }
  table.shares td { border-bottom: 0.5pt solid #ddd; padding: 2pt 14pt 2pt 0; }
  table.shares .pct { text-align: right; }
  table.shares .total td { border-top: 1pt solid #999; border-bottom: 0; font-weight: bold; }
  h1, h2, h3 { break-after: avoid; }
</style>
</head>
<body>
  <p class="kicker">Партнёрское соглашение · ${KIND_LABELS[doc.sessionKind] ?? escapeHtml(doc.sessionKind)}</p>
  <h1>${escapeHtml(doc.partnershipName)}</h1>
  ${doc.sessionTitle ? `<p class="subtitle">${escapeHtml(doc.sessionTitle)}</p>` : ''}
  <table class="head-meta"><tbody>
    <tr><td class="label">Участники</td><td>${participants}</td></tr>
    <tr><td class="label">Дата сборки</td><td>${assembledDate}</td></tr>
    <tr><td class="label">Статус сессии</td><td>${SESSION_STATUS_LABELS[doc.sessionStatus] ?? escapeHtml(doc.sessionStatus)}</td></tr>
    <tr><td class="label">Готовность</td><td>согласовано: ${doc.summary.agreed}/${doc.summary.applicable} · подтверждено всеми: ${doc.summary.fullyConfirmed}</td></tr>
  </tbody></table>
  ${draftNote}
  <h2>Принципы партнёрского соглашения</h2>
  <ol class="principles">${principles}</ol>
  <h2>Договорённости</h2>
  ${sections}
</body>
</html>`;
}
