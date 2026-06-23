import { describe, expect, it } from 'vitest';

import { t } from './index';

describe('i18n t()', () => {
  it('returns the Russian string for known keys', () => {
    expect(t('login.submit')).toBe('Войти');
    expect(t('partnerships.title')).toBe('Партнёрства');
    expect(t('appName')).toBe('Помощник партнёрских сессий');
  });
});
