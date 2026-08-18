/**
 * D9 — ПЕСП («Тест естественной совместимости партнёров», Гриц/Кибкало)
 * reference data for the compatibility step and the scenario adaptation.
 *
 * DRAFT (v0): the 32 construct names below are transcribed from the app's
 * PUBLIC marketing materials (announcement t.me/DeanIBL/1212 + published
 * profile screenshots); several are best-effort reconstructions. The
 * construct→question mapping is our working hypothesis for highlighting
 * scenario blocks and must be validated with Gritz. The proprietary parts of
 * the methodology (the 184-question bank, scoring, zone thresholds) are NOT
 * here and must never be added without a written agreement.
 */

export type Zone = 'green' | 'yellow' | 'red';

export interface PayloadConstruct {
  code: string;
  name: string;
  block?: string;
  zone: Zone;
  values?: number[];
}

/** `test_import.payload` as returned by the API. */
export interface TestImportPayload {
  source: 'file' | 'manual' | 'file+manual';
  partners?: string[];
  score?: number;
  level?: 'A' | 'B' | 'C' | 'D';
  constructs: PayloadConstruct[];
}

export interface TestImport {
  id: string;
  partnershipId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  status: 'received' | 'parsed';
  payload: TestImportPayload | null;
  uploadedAt: string;
}

export type ConstructBlock = 'difference' | 'parity' | 'match';

export const BLOCK_LABELS: Record<ConstructBlock, string> = {
  difference: 'Различие',
  parity: 'Паритет',
  match: 'Совпадение',
};

export interface ConstructRef {
  code: string;
  name: string;
  block: ConstructBlock;
  /** Scenario question numbers (1–30) this construct feeds attention into. */
  questions: number[];
}

export const CONSTRUCTS: ConstructRef[] = [
  // Различие — партнёрам полезно различаться (профиль ролей).
  { code: 'product_creation', name: 'Продукт — создание', block: 'difference', questions: [3, 7] },
  {
    code: 'capital_economic',
    name: 'Экономический капитал',
    block: 'difference',
    questions: [5, 6],
  },
  { code: 'capital_human', name: 'Человеческий капитал', block: 'difference', questions: [5, 10] },
  { code: 'capital_social', name: 'Социальный капитал', block: 'difference', questions: [5] },
  { code: 'paei_roles', name: 'Роли PAEI', block: 'difference', questions: [10, 14] },
  { code: 'goal_setting', name: 'Постановка целей', block: 'difference', questions: [4] },
  { code: 'lead_follow', name: 'Ведущий — ведомый', block: 'difference', questions: [15] },
  { code: 'publicity', name: 'Отношение к публичности', block: 'difference', questions: [10] },
  // Паритет — важен баланс выраженности.
  { code: 'plan_flexibility', name: 'План — гибкость', block: 'parity', questions: [4, 16] },
  { code: 'trust_source', name: 'Источник доверия', block: 'parity', questions: [19] },
  { code: 'stress_inner', name: 'Стресс внутри', block: 'parity', questions: [22, 24] },
  { code: 'stress_outer', name: 'Стресс снаружи', block: 'parity', questions: [22, 24] },
  { code: 'outer_boundaries', name: 'Внешние границы', block: 'parity', questions: [17, 18] },
  {
    code: 'horizon_scale',
    name: 'Горизонт планирования и масштаб',
    block: 'parity',
    questions: [2, 4],
  },
  { code: 'mistakes_attitude', name: 'Отношение к ошибкам', block: 'parity', questions: [19, 21] },
  { code: 'risk_attitude', name: 'Отношение к рискам', block: 'parity', questions: [9, 29] },
  // Совпадение — важно совпадать.
  { code: 'thinker_doer', name: 'Мыслитель — деятель', block: 'match', questions: [10, 11] },
  {
    code: 'decisions_emotion_reason',
    name: 'Принятие решений: эмоции — разум',
    block: 'match',
    questions: [15, 16],
  },
  { code: 'persuasion_style', name: 'Стиль убеждения', block: 'match', questions: [15] },
  { code: 'disagreement_style', name: 'Стиль несогласия', block: 'match', questions: [20, 21] },
  {
    code: 'concrete_abstract',
    name: 'Конкретность — абстрактность',
    block: 'match',
    questions: [16],
  },
  {
    code: 'intro_extraversion',
    name: 'Интроверсия — экстраверсия',
    block: 'match',
    questions: [22],
  },
  {
    code: 'power_cooperation',
    name: 'Власть — сотрудничество',
    block: 'match',
    questions: [14, 15],
  },
  {
    code: 'communication_context',
    name: 'Контекстность коммуникации',
    block: 'match',
    questions: [19],
  },
  { code: 'stability_vectors', name: 'Векторы устойчивости', block: 'match', questions: [21, 23] },
  { code: 'work_rhythm', name: 'Ритм и режим работы', block: 'match', questions: [12] },
  {
    code: 'commitment_punctuality',
    name: 'Обязательность — пунктуальность',
    block: 'match',
    questions: [11],
  },
  {
    code: 'feedback_partner',
    name: 'Обратная связь партнёру',
    block: 'match',
    questions: [19, 22],
  },
  {
    code: 'profit_meaning',
    name: 'Прибыль — значимость бизнеса',
    block: 'match',
    questions: [2, 8],
  },
  {
    code: 'commitment_fixation',
    name: 'Обязательность: форма фиксации',
    block: 'match',
    questions: [23, 30],
  },
  { code: 'life_work', name: 'Дело жизни', block: 'match', questions: [2, 12] },
  {
    code: 'commitment_personal_common',
    name: 'Обязательность: личное — общее',
    block: 'match',
    questions: [13, 17],
  },
];

const constructByCode = new Map(CONSTRUCTS.map((construct) => [construct.code, construct]));

/** The import whose zones drive the UI: the most recent one (list is desc). */
export function activeImport(imports: TestImport[] | undefined): TestImport | null {
  return imports?.[0] ?? null;
}

export interface AttentionZone {
  code: string;
  name: string;
  zone: Exclude<Zone, 'green'>;
  values?: number[];
}

/**
 * Yellow/red zones of a payload keyed by scenario question number, for the
 * TOC markers and the in-block callout. Constructs with unknown codes have
 * no mapping and simply do not highlight anything.
 */
export function attentionByQuestion(
  payload: TestImportPayload | null | undefined,
): Map<number, AttentionZone[]> {
  const map = new Map<number, AttentionZone[]>();
  if (!payload) {
    return map;
  }
  for (const construct of payload.constructs) {
    if (construct.zone === 'green') {
      continue;
    }
    const ref = constructByCode.get(construct.code);
    if (!ref) {
      continue;
    }
    for (const number of ref.questions) {
      const zones = map.get(number) ?? [];
      zones.push({
        code: construct.code,
        name: construct.name,
        zone: construct.zone,
        values: construct.values,
      });
      map.set(number, zones);
    }
  }
  // Red first inside every block's list.
  for (const zones of map.values()) {
    zones.sort((a, b) => (a.zone === b.zone ? 0 : a.zone === 'red' ? -1 : 1));
  }
  return map;
}

/** Worst zone for a question: red beats yellow; null when unmapped. */
export function worstZone(zones: AttentionZone[] | undefined): 'red' | 'yellow' | null {
  if (!zones || zones.length === 0) {
    return null;
  }
  return zones.some((z) => z.zone === 'red') ? 'red' : 'yellow';
}
