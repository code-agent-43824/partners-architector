/**
 * Default legalization presets (spec Appendix B): which legal carriers a topic
 * is, by default, mapped onto. These are editable suggestions used when
 * building the legalization checklist (Phase 4, FR-8.3) — not hard rules.
 *
 * `carriers` values must be members of the Prisma `Carrier` enum; this is
 * asserted in the accompanying test.
 */
export interface CarrierPreset {
  topic: string;
  carriers: string[];
}

export const DEFAULT_CARRIER_PRESETS: CarrierPreset[] = [
  { topic: 'Доли и полномочия', carriers: ['charter', 'shareholders_agreement'] },
  { topic: 'Роли и зоны ответственности', carriers: ['job_description', 'employment_contract'] },
  { topic: 'Опционы сотрудникам', carriers: ['option_agreement'] },
  { topic: 'Партнёрство с инвестором', carriers: ['investment_memo', 'term_sheet'] },
  { topic: 'Защита в случае развода', carriers: ['prenup'] },
  { topic: 'Наследование / смерть партнёра', carriers: ['will'] },
];
