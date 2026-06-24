import type { PartnershipTag } from '../api/partnerships';

export const PARTNERSHIP_TAGS: PartnershipTag[] = [
  'new',
  'existing',
  'with_investor',
  'employee_options',
  'collaboration',
  'other',
];

export const PARTNERSHIP_TAG_LABELS: Record<PartnershipTag, string> = {
  new: 'Новое',
  existing: 'Действующее',
  with_investor: 'С инвестором',
  employee_options: 'Опционы сотрудникам',
  collaboration: 'Коллаборация',
  other: 'Другое',
};
