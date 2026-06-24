import { ru, type TranslationKey } from './ru';

export type { TranslationKey } from './ru';

/** Translate a key. Single ru dictionary for now; swap for a real i18n lib later. */
export function t(key: TranslationKey): string {
  return ru[key];
}
