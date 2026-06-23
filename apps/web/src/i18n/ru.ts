/** Russian strings (NFR-4: ru is the primary locale; architecture i18n-ready). */
export const ru = {
  appName: 'Помощник партнёрских сессий',
  'common.loading': 'Загрузка…',
  'login.title': 'Вход',
  'login.email': 'E-mail',
  'login.password': 'Пароль',
  'login.submit': 'Войти',
  'login.error': 'Не удалось войти. Проверьте e-mail и пароль.',
  'nav.logout': 'Выйти',
  'partnerships.title': 'Партнёрства',
  'partnerships.empty': 'Пока нет партнёрств. Список появится на следующих этапах.',
} as const;

export type TranslationKey = keyof typeof ru;
