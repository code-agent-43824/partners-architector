import { ClauseStatus, SessionKind, SessionStatus } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import { PRINCIPLES } from '../seed/principles';
import { escapeHtml, renderAgreementHtml } from './agreement-html';
import type { AgreementDocument, AgreementSection } from './agreement.types';

function section(over: Partial<AgreementSection> = {}): AgreementSection {
  return {
    number: 1,
    title: 'Состав совладельцев',
    category: 'Партнёрский контур',
    isSensitive: false,
    status: ClauseStatus.agreed,
    text: '<p>Текст</p>',
    rationale: null,
    naReason: null,
    signoffs: [],
    shares: null,
    meaning: null,
    ...over,
  };
}

function doc(sections: AgreementSection[]): AgreementDocument {
  return {
    partnershipName: 'Кофейня «Тест & Ко»',
    participants: [{ fullName: 'Иван', role: 'Сооснователь' }],
    sessionTitle: null,
    sessionKind: SessionKind.initial,
    sessionStatus: SessionStatus.in_progress,
    assembledAt: new Date('2026-07-07T12:00:00Z').toISOString(),
    summary: { total: sections.length, applicable: sections.length, agreed: 1, fullyConfirmed: 0 },
    principles: PRINCIPLES,
    sections,
  };
}

describe('renderAgreementHtml', () => {
  it('escapes plain-text fields', () => {
    expect(escapeHtml('<b>&"\'')).toBe('&lt;b&gt;&amp;&quot;&#39;');
    const html = renderAgreementHtml(doc([section({ title: 'A<script>' })]));
    expect(html).toContain('Кофейня «Тест &amp; Ко»');
    expect(html).toContain('A&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('sanitizes stored formulation HTML (defense in depth)', () => {
    const html = renderAgreementHtml(
      doc([
        section({
          text: '<p onclick="x">Ok <strong>bold</strong></p><img src=x onerror=alert(1)><script>alert(2)</script>',
        }),
      ]),
    );
    expect(html).toContain('<p>Ok <strong>bold</strong></p>');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('<script>alert');
  });

  it('renders principles, draft note, na reason, shares and meaning', () => {
    const html = renderAgreementHtml(
      doc([
        section({
          number: 5,
          shares: {
            allocations: [
              { partnerName: 'Иван', percent: 60 },
              { partnerName: 'Мария', percent: 40 },
            ],
            total: 100,
          },
        }),
        section({
          number: 6,
          meaning: { voting: false, profit: true, ownership: true, losses: false },
        }),
        section({
          number: 12,
          status: ClauseStatus.not_applicable,
          naReason: 'Нет инвесторов',
          text: null,
        }),
      ]),
    );
    expect(html).toContain('Принципы партнёрского соглашения');
    for (const principle of PRINCIPLES) {
      expect(html).toContain(principle.title.slice(0, 20));
    }
    expect(html).toContain('Черновик: сессия не завершена');
    expect(html).toContain('Неактуально: Нет инвесторов');
    expect(html).toContain('60%');
    expect(html).toContain('Итого');
    expect(html).toContain('Смысл долей: прибыль, владение');
  });
});
