/**
 * Guided onboarding interstitials (D7): one entry per screen kind. Product
 * content (not UI chrome), so it lives here rather than in the i18n
 * dictionary. «future» lists real roadmap items from the spec phases so the
 * demo tells the story of what arrives next.
 */

export type GuidedKind = 'partnerships' | 'partnership' | 'session' | 'agreement';

export interface GuidedScreen {
  kind: GuidedKind;
  title: string;
  /** What this screen is and why it exists. */
  lead: string;
  /** How to use it — short imperative steps. */
  how: string[];
  /** What will appear here in future releases. */
  future: string[];
}

export const GUIDED_SCREENS: GuidedScreen[] = [
  {
    kind: 'partnerships',
    title: 'Ваши партнёрства',
    lead: 'Это список ваших кейсов. Каждое партнёрство — отдельное дело: участники, сессии и собранное соглашение. Данные видите только вы: кейсы других архитекторов изолированы.',
    how: [
      'Создайте партнёрство и укажите его тип — новое или действующее: от этого зависят подсказки методики.',
      'Открывайте кейс, чтобы вести участников, сессии и соглашение.',
      'Поиск и архив помогут, когда кейсов станет много.',
    ],
    future: [
      'Напоминания об актуализации соглашения — методика рекомендует пересматривать его раз в год.',
      'Сводная панель по всем кейсам: статусы, ближайшие сессии, задолженности по подтверждениям.',
    ],
  },
  {
    kind: 'partnership',
    title: 'Карточка партнёрства',
    lead: 'Далее вам будет предложено добавить участников партнёрства — заполните их имена, роли и контакты (от 2 до 5 человек) — и создать партнёрскую сессию.',
    how: [
      'Добавьте участников будущего соглашения и упорядочите их.',
      'Создайте сессию: «первичная» — полный проход 30 вопросов методики, «актуализация» — пересмотр на базе прошлой сессии.',
      'Начать сессию можно, когда в партнёрстве не меньше двух участников.',
    ],
    future: [
      'Личные кабинеты партнёров: перед сессией каждый участник ответит на предсессионный опросник и добавит свои вопросы к рассмотрению — вы увидите сводку расхождений ещё до встречи.',
      'Публикация готовых документов (соглашение, чек-лист) прямо в кабинеты партнёров.',
    ],
  },
  {
    kind: 'session',
    title: 'Сценарий сессии',
    lead: 'Это день сессии: 30 вопросов методики по шести контурам. Слева — оглавление со статусами блоков, справа — текущий блок: формулировка договорённости, мотивация, статус и подтверждения партнёров.',
    how: [
      'Двигайтесь по блокам клавишами ← / → или через оглавление.',
      'Фиксируйте договорённость прямо в блоке — текст сохраняется автоматически, история версий всегда под рукой.',
      '«Согласовано» доступно только при заполненной формулировке, а «неактуально» потребует причину — так методика не даёт молча уйти от трудного вопроса.',
    ],
    future: [
      'Калькулятор Грица в блоке долей: расчёт долей по вкладу трёх капиталов — экономического, человеческого и социального.',
      'Матрица полномочий в блоке о принятии решений: типы решений × партнёры, уровни I–V.',
      'AI-помощник формулировок и расшифровка записи сессии — на вашем собственном сервере, без внешних облаков.',
    ],
  },
  {
    kind: 'agreement',
    title: 'Партнёрское соглашение',
    lead: 'Документ собирается автоматически из зафиксированных договорённостей: титульный лист, четыре принципа методики, 30 разделов и таблица долей. Пока сессия не завершена, это черновик.',
    how: [
      'Просмотрите разделы: пустые блоки и «неактуально» с причинами видны сразу.',
      'Скачайте PDF для печати или DOCX, чтобы доработать документ в редакторе.',
      'Каждый экспорт фиксируется в журнале — видно, кто и когда выгружал документ.',
    ],
    future: [
      'Чек-лист легализации: какой пункт соглашения в какой юридический документ попадёт — устав, корпоративный договор, брачные договоры.',
      'Фирменный шаблон MOST Partners для документов.',
      'Отправка соглашения и чек-листа в личные кабинеты партнёров.',
    ],
  },
];

/** Map a route pathname to its guided screen, if any. */
export function guidedScreenFor(pathname: string): GuidedScreen | null {
  const kind: GuidedKind | null =
    pathname === '/'
      ? 'partnerships'
      : /^\/partnerships\/[^/]+$/.test(pathname)
        ? 'partnership'
        : /^\/partnerships\/[^/]+\/sessions\/[^/]+$/.test(pathname)
          ? 'session'
          : /^\/partnerships\/[^/]+\/sessions\/[^/]+\/agreement$/.test(pathname)
            ? 'agreement'
            : null;
  return kind ? (GUIDED_SCREENS.find((screen) => screen.kind === kind) ?? null) : null;
}

const STORAGE_KEY = 'psa_guided_seen';

/** Screens already shown in this browser session (survives SPA navigation only). */
export function wasSeen(kind: GuidedKind): boolean {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]).includes(kind) : false;
  } catch {
    return false;
  }
}

export function markSeen(kind: GuidedKind): void {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const seen = raw ? (JSON.parse(raw) as string[]) : [];
    if (!seen.includes(kind)) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...seen, kind]));
    }
  } catch {
    /* storage unavailable — interstitials simply repeat */
  }
}
