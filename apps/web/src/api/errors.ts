import { t, type TranslationKey } from '../i18n';
import { ApiError } from './client';

/** Map an HTTP status to a specific, user-facing ru message key. */
function keyForStatus(status: number): TranslationKey {
  if (status === 400 || status === 422) {
    return 'error.validation';
  }
  if (status === 401) {
    return 'error.unauthorized';
  }
  if (status === 403) {
    return 'error.forbidden';
  }
  if (status === 404) {
    return 'error.notFound';
  }
  if (status === 409) {
    return 'error.conflict';
  }
  if (status === 429) {
    return 'error.tooMany';
  }
  if (status >= 500) {
    return 'error.server';
  }
  return 'common.error';
}

/**
 * Turn an unknown thrown value into a specific Russian message.
 * `fetch` rejects with a `TypeError` on network failure (offline, DNS, reset),
 * so those map to the "no connection" message rather than a generic error.
 */
export function apiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return t(keyForStatus(error.status));
  }
  if (error instanceof TypeError) {
    return t('error.network');
  }
  return t('common.error');
}
