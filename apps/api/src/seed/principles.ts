/**
 * The four principles of a partnership agreement (spec Appendix G, FR-8.2).
 * Included as the intro section of the assembled agreement (DOC-1).
 *
 * Kept as seed data here (a code constant) rather than a DB table for now, so
 * changing the wording needs no schema/migration — consistent with the spec's
 * note that principle texts are edited "через сид-данные". A future step can
 * move these to a seeded `principle` table (like `question`) when an editing UI
 * is built. Draft wording — to be confirmed with Dmitry Gritz.
 */
export interface Principle {
  title: string;
  body: string;
}

export const PRINCIPLES_VERSION = 'mvp-draft-1';

export const PRINCIPLES: Principle[] = [
  {
    title: 'Пока не договорились обо всём — не договорились ни о чём.',
    body: 'Частичные договорённости не применяются в отрыве от целого. Пока соглашение не завершено, любой ранее согласованный пункт можно вернуть к обсуждению и пересмотреть.',
  },
  {
    title: 'Толкование системное.',
    body: 'Все договорённости применяются и толкуются совместно; ни один пункт не интерпретируется в отрыве от остальных. К пунктам можно прикладывать пояснение мотивации, помогающее понять их смысл.',
  },
  {
    title: 'Нарушение одного пункта не обнуляет соглашение.',
    body: 'Несоблюдение партнёром одного условия не освобождает остальных от выполнения других и не даёт права «отвечать тем же»; нарушение разбирается отдельно по согласованной процедуре.',
  },
  {
    title: 'Незаписанные договорённости необязательны к исполнению.',
    body: 'Обязательны только письменно зафиксированные и согласованные всеми партнёрами договорённости; любые устные дополнения вносятся в соглашение, иначе не действуют.',
  },
];
