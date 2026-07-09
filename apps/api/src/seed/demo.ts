import {
  ClauseStatus,
  PartnershipTag,
  type PrismaClient,
  Role,
  SessionKind,
  SessionStatus,
} from '@prisma/client';

import { QUESTION_SET_VERSION } from './questions';

/**
 * Demo kit seed (demo-readiness step D5): a realistic, coherent partnership
 * case so the Gritz demo starts from a living product, not empty screens.
 *
 * Safety model — designed to be run on the LIVE database:
 * - Everything belongs to a dedicated demo architect account; nothing outside
 *   it is read or written. A dedicated login also keeps real partnerships out
 *   of sight during the demo.
 * - Idempotent by delete-and-recreate: each run deletes ONLY the demo
 *   partnership (matched by demo owner + exact name; children go by cascade)
 *   and rebuilds the reference state. Re-running is the "reset the demo" button.
 * - The account password comes from the caller (env) — no default credential
 *   ever ships in code or the database.
 */

export const DEMO_PARTNERSHIP_NAME = 'Кофейня «Третье место» (демо)';
export const DEMO_SESSION_TITLE = 'Первичная партнёрская сессия';
export const DEMO_DEFAULT_EMAIL = 'demo@partners-architector.local';

export const DEMO_PARTNERS = [
  { fullName: 'Иван Петров', role: 'Сооснователь, операционка' },
  { fullName: 'Мария Сидорова', role: 'Сооснователь, продукт и бренд' },
  { fullName: 'Алексей Кузнецов', role: 'Сооснователь, финансы' },
] as const;

/** Per-block demo fill; `confirmed` = indexes into DEMO_PARTNERS who signed off. */
export interface DemoClause {
  number: number;
  status: ClauseStatus;
  text?: string;
  rationale?: string;
  naReason?: string;
  structuredData?: object;
  confirmed?: number[];
}

const ALL = [0, 1, 2];

export const DEMO_CLAUSES: DemoClause[] = [
  {
    number: 1,
    status: ClauseStatus.agreed,
    text: '<p>Фактические совладельцы: <strong>Иван Петров</strong>, <strong>Мария Сидорова</strong>, <strong>Алексей Кузнецов</strong>. Далее по тексту — Партнёр 1, Партнёр 2, Партнёр 3. Юридически бизнес оформляется на ООО с тремя участниками.</p>',
    confirmed: ALL,
  },
  {
    number: 2,
    status: ClauseStatus.agreed,
    text: '<p>Видение: сеть городских кофеен-«третьих мест», куда приходят не только за кофе, а за живым общением. Миссия — возвращать людям привычку разговаривать друг с другом. Через 3 года — 3 точки и узнаваемый бренд в своём городе.</p>',
    rationale: 'Сверили личные цели: всем троим важен не «экзит», а устойчивый городской бизнес.',
    confirmed: ALL,
  },
  {
    number: 3,
    status: ClauseStatus.agreed,
    text: '<p>Бизнес: кофейня полного цикла (зерно, бар, небольшая кухня) с событийной программой. Не делаем: франшизу, доставку как отдельное направление, алкоголь.</p>',
    confirmed: ALL,
  },
  {
    number: 4,
    status: ClauseStatus.agreed,
    text: '<p>Этапы: 1) запуск первой точки и выход на безубыточность к 9-му месяцу; 2) обкатка модели, команда без партнёров в смене; 3) открытие второй и третьей точек из прибыли. Переход между этапами подтверждаем совместным решением.</p>',
    confirmed: ALL,
  },
  {
    number: 5,
    status: ClauseStatus.agreed,
    text: '<p>Доли отражают вклад трёх капиталов на старте и зафиксированы ниже. Пересматриваем только при существенном изменении вкладов и только все вместе.</p>',
    rationale: 'Иван вкладывает больше денег и весь операционный труд первого года.',
    structuredData: {
      shares: {
        mode: 'manual',
        allocations: [{ percent: 50 }, { percent: 30 }, { percent: 20 }],
      },
    },
    confirmed: ALL,
  },
  {
    number: 6,
    status: ClauseStatus.agreed,
    text: '<p>Доли определяют распределение прибыли, владение и участие в убытках. Голосование <strong>не</strong> привязано к долям: операционные решения — большинством голосов «один партнёр — один голос».</p>',
    structuredData: {
      meaning: { voting: false, profit: true, ownership: true, losses: true },
    },
    confirmed: ALL,
  },
  {
    number: 7,
    status: ClauseStatus.agreed,
    text: '<p>Модель: собственная точка, выручка — бар и кухня. Ориентиры первого года:</p><ul><li>стартовый бюджет — 6 млн ₽ равными траншами по графику;</li><li>средний чек — 450 ₽, 180 чеков в день к 6-му месяцу;</li><li>фонд оплаты труда — не выше 32% выручки.</li></ul>',
    confirmed: ALL,
  },
  {
    number: 8,
    status: ClauseStatus.agreed,
    text: '<p>Первые 12 месяцев дивиденды не распределяем: прибыль идёт в резервный фонд (до 1,5 млн ₽) и развитие. Дальше — ежеквартально пропорционально долям при выполнении плана по резерву.</p>',
    confirmed: ALL,
  },
  {
    number: 9,
    status: ClauseStatus.parked,
    text: '<p>База: убытки покрываем пропорционально долям. Открытый вопрос — потолок докапитализации и что делать, если один из партнёров не может внести свою часть. Вернёмся после теста первой точки.</p>',
  },
  {
    number: 10,
    status: ClauseStatus.agreed,
    text: '<p>Иван — операционка и команда; Мария — продукт, бренд, события; Алексей — финансы, закупки, юридика. Пересечения решаем через еженедельную планёрку.</p>',
    confirmed: ALL,
  },
  {
    number: 11,
    status: ClauseStatus.agreed,
    text: '<p>Каждый закрывает зону лично минимум до конца первого года; передача зоны наёмному менеджеру — только совместным решением с планом передачи.</p>',
    confirmed: ALL,
  },
  {
    number: 12,
    status: ClauseStatus.agreed,
    text: '<p>Отпуск — 28 дней в году, не более 14 подряд, график согласуем на квартал вперёд; в высокий сезон (декабрь) отпуска не берём. На время отпуска зона передаётся конкретному партнёру.</p>',
    confirmed: ALL,
  },
  {
    number: 13,
    status: ClauseStatus.agreed,
    text: '<p>Ключевая ценность: честность раньше комфорта — говорим о проблемах сразу; гостеприимство — к гостям и друг к другу; считаем деньги, а не впечатления.</p>',
    confirmed: ALL,
  },
  {
    number: 14,
    status: ClauseStatus.agreed,
    text: '<p>Как собственники: утверждаем стратегию и бюджет года, нанимаем/увольняем управляющего, распоряжаемся прибылью, контролируем ключевые метрики раз в месяц.</p>',
    confirmed: ALL,
  },
  {
    number: 15,
    status: ClauseStatus.in_progress,
    text: '<p>Операционные решения — большинством, «один партнёр — один голос». Стратегические (бюджет года, новая точка, кредит, изменение долей) — единогласно. Составляем матрицу полномочий по типам решений.</p>',
  },
  {
    number: 16,
    status: ClauseStatus.agreed,
    text: '<p>Еженедельная планёрка по понедельникам (решения фиксируем письменно), финансовый отчёт — до 5-го числа, стратегическая сессия — раз в квартал. Решение без кворума (все трое) не считается принятым.</p>',
    confirmed: ALL,
  },
  {
    number: 17,
    status: ClauseStatus.agreed,
    text: '<p>Дополнительная деятельность допустима, если не конкурирует с кофейней и не отнимает ресурс зоны ответственности. Участие в другом общепите города — только с согласия партнёров.</p>',
    confirmed: ALL,
  },
  {
    number: 18,
    status: ClauseStatus.not_applicable,
    naReason:
      'Команда первой точки — до 6 человек, нанимают сами партнёры. Ограничения по найму (родственники, аффилированные) на этом этапе не вводим; вернёмся к вопросу при найме управляющего.',
  },
  {
    number: 19,
    status: ClauseStatus.agreed,
    text: '<p>Раз в неделю на планёрке — короткий статус по зоне (факт/план/риски); раз в месяц — цифры точки против бюджета. Плохие новости сообщаем в течение суток, не копим.</p>',
    confirmed: ALL,
  },
  {
    number: 20,
    status: ClauseStatus.agreed,
    text: '<p>Тупиковая ситуация (нет единогласия по стратегическому вопросу дважды подряд): берём паузу 2 недели → приглашаем согласованного модератора → если тупик сохраняется, действует статус-кво, инициатор может выйти по правилам блока №25.</p>',
    rationale: 'Правило «статус-кво по умолчанию» защищает бизнес от паралича.',
    confirmed: ALL,
  },
  {
    number: 21,
    status: ClauseStatus.agreed,
    text: '<p>При конфликте: сначала разговор один на один, затем — втроём на отдельной встрече (не на планёрке), затем — внешний модератор. Конфликт не выносим на команду и гостей; рабочие процессы продолжаются.</p>',
    confirmed: [0, 1],
  },
  {
    number: 22,
    status: ClauseStatus.agreed,
    text: '<p>Ритуалы: совместная дегустация новинок раз в месяц, «ретро» партнёров раз в квартал (что улучшить в самом партнёрстве), один совместный выходной-выезд в полгода.</p>',
    confirmed: ALL,
  },
  {
    number: 23,
    status: ClauseStatus.agreed,
    text: '<p>Актуализация соглашения — раз в год в январе (после новогоднего сезона) и внепланово при существенных изменениях (новая точка, выход/вход партнёра, инвестор).</p>',
    confirmed: ALL,
  },
  {
    number: 24,
    status: ClauseStatus.in_progress,
    text: '<p>Каждый пишет короткую «инструкцию по работе со мной»: как я принимаю решения, что меня демотивирует, как со мной говорить о проблемах. Иван и Мария сдали, Алексей дописывает.</p>',
  },
  {
    number: 25,
    status: ClauseStatus.disputed,
    text: '<p>Согласовано: выходящий партнёр предлагает свою долю сначала остающимся (преимущественное право), рассрочка выкупа до 12 месяцев. <strong>Спор:</strong> Иван настаивает на оценке по формуле из блока №29, Мария — на независимом оценщике.</p>',
    rationale: 'Вернуться после согласования формулы стоимости (блок №29).',
  },
  {
    number: 26,
    status: ClauseStatus.agreed,
    text: '<p>Продажа доли третьим лицам — только после отказа остающихся партнёров и только покупателю, одобренному единогласно. Дарение и передача в залог без согласия партнёров запрещены.</p>',
    confirmed: [0],
  },
  {
    number: 27,
    status: ClauseStatus.agreed,
    text: '<p>Доли — личное имущество каждого партнёра: оформляем брачные договоры/соглашения, исключающие раздел доли при разводе. Без такого документа партнёр не входит в состав участников ООО.</p>',
    confirmed: ALL,
  },
  {
    number: 28,
    status: ClauseStatus.agreed,
    text: '<p>В случае смерти партнёра наследники получают выплату стоимости доли по правилам блока №29, но не входят в управление. Оформляем это в уставе ООО и корпоративном договоре на этапе легализации.</p>',
    confirmed: ALL,
  },
  {
    number: 29,
    status: ClauseStatus.parked,
    text: '<p>Рабочий вариант: стоимость компании = средняя годовая EBITDA × 3, но не ниже остаточной стоимости вложений. Отложено до первых 6 месяцев реальных цифр; связано со спором в блоке №25.</p>',
  },
  {
    number: 30,
    status: ClauseStatus.agreed,
    text: '<p>Легализуем: устав ООО, корпоративный договор (тупик, выход, наследование, развод), брачные договоры. Ответственный — Алексей, срок — до открытия точки; чек-лист легализации ведём в системе.</p>',
    confirmed: ALL,
  },
];

/** Two historical versions for block №2 so the demo can show history + rollback. */
export const DEMO_VERSIONS_BLOCK = 2;
export const DEMO_VERSIONS: { text: string; note: string | null; minutesAgo: number }[] = [
  {
    text: '<p>Хотим открыть кофейню и зарабатывать на любимом деле.</p>',
    note: 'Первая формулировка в начале сессии',
    minutesAgo: 90,
  },
  {
    text: '<p>Видение: городская кофейня-«третье место». Миссия — возвращать людям привычку живого общения. Горизонт — 3 года.</p>',
    note: null,
    minutesAgo: 45,
  },
];

export interface DemoSeedResult {
  email: string;
  partnershipId: string;
  sessionId: string;
  clauses: number;
  agreed: number;
  signoffs: number;
  versions: number;
}

export async function seedDemo(
  prisma: PrismaClient,
  options: { email: string; passwordHash: string },
): Promise<DemoSeedResult> {
  const email = options.email.toLowerCase();

  const questions = await prisma.question.findMany({
    where: { questionSetVersion: QUESTION_SET_VERSION },
    orderBy: { orderIndex: 'asc' },
    select: { id: true, number: true },
  });
  if (questions.length === 0) {
    throw new Error(
      `No questions found for question set "${QUESTION_SET_VERSION}" — run the base seed first (pnpm --filter @psa/api db:seed).`,
    );
  }

  // Dedicated demo account; a re-run rotates the password to the provided one.
  const account = await prisma.account.upsert({
    where: { email },
    update: { passwordHash: options.passwordHash, role: Role.architect },
    create: {
      email,
      passwordHash: options.passwordHash,
      role: Role.architect,
      displayName: 'Демо-архитектор',
    },
  });

  // Reset to the reference state: drop ONLY this account's demo partnership.
  await prisma.partnership.deleteMany({
    where: { ownerAccountId: account.id, name: DEMO_PARTNERSHIP_NAME },
  });

  const now = Date.now();
  const partnership = await prisma.partnership.create({
    data: {
      ownerAccountId: account.id,
      name: DEMO_PARTNERSHIP_NAME,
      typeTags: [PartnershipTag.new],
      notes: 'Демонстрационный кейс. Пересоздаётся командой db:seed:demo.',
    },
  });

  const partners = [] as { id: string }[];
  for (const [index, partner] of DEMO_PARTNERS.entries()) {
    partners.push(
      await prisma.partner.create({
        data: {
          partnershipId: partnership.id,
          fullName: partner.fullName,
          role: partner.role,
          orderIndex: index + 1,
        },
      }),
    );
  }

  const session = await prisma.session.create({
    data: {
      partnershipId: partnership.id,
      kind: SessionKind.initial,
      title: DEMO_SESSION_TITLE,
      status: SessionStatus.in_progress,
      startedAt: new Date(now - 2 * 60 * 60 * 1000),
    },
  });

  const byNumber = new Map(DEMO_CLAUSES.map((c) => [c.number, c]));
  let signoffs = 0;
  let versions = 0;

  for (const question of questions) {
    const fill = byNumber.get(question.number);
    // Wire partner ids into the shares payload (partner order matches DEMO_PARTNERS).
    const structuredData =
      fill?.structuredData && 'shares' in fill.structuredData
        ? {
            shares: {
              mode: 'manual',
              allocations: (
                fill.structuredData as { shares: { allocations: { percent: number }[] } }
              ).shares.allocations.map((a, i) => ({
                partnerId: partners[i]!.id,
                percent: a.percent,
              })),
            },
          }
        : fill?.structuredData;

    const clause = await prisma.clause.create({
      data: {
        sessionId: session.id,
        questionId: question.id,
        status: fill?.status ?? ClauseStatus.not_started,
        text: fill?.text ?? null,
        rationale: fill?.rationale ?? null,
        naReason: fill?.naReason ?? null,
        ...(structuredData ? { structuredData } : {}),
      },
    });

    for (const partnerIndex of fill?.confirmed ?? []) {
      await prisma.clauseSignoff.create({
        data: {
          clauseId: clause.id,
          partnerId: partners[partnerIndex]!.id,
          agreed: true,
          signedAt: new Date(now - 30 * 60 * 1000),
        },
      });
      signoffs += 1;
    }

    if (question.number === DEMO_VERSIONS_BLOCK) {
      for (const version of DEMO_VERSIONS) {
        await prisma.clauseVersion.create({
          data: {
            clauseId: clause.id,
            text: version.text,
            rationale: null,
            status: ClauseStatus.in_progress,
            note: version.note,
            editedAt: new Date(now - version.minutesAgo * 60 * 1000),
          },
        });
        versions += 1;
      }
    }
  }

  return {
    email,
    partnershipId: partnership.id,
    sessionId: session.id,
    clauses: questions.length,
    agreed: DEMO_CLAUSES.filter((c) => c.status === ClauseStatus.agreed).length,
    signoffs,
    versions,
  };
}
