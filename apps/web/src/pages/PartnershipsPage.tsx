import { useNavigate } from 'react-router-dom';

import { useLogout, useMe } from '../auth/useAuth';
import { t } from '../i18n';

export function PartnershipsPage() {
  const navigate = useNavigate();
  const { data: user } = useMe();
  const logout = useLogout();

  return (
    <div className="page">
      <header className="topbar">
        <strong>{t('appName')}</strong>
        <span className="spacer" />
        {user ? <span className="muted">{user.email}</span> : null}
        <button
          type="button"
          onClick={() =>
            logout.mutate(undefined, { onSuccess: () => navigate('/login', { replace: true }) })
          }
        >
          {t('nav.logout')}
        </button>
      </header>
      <main className="content">
        <h1>{t('partnerships.title')}</h1>
        <p className="muted">{t('partnerships.empty')}</p>
      </main>
    </div>
  );
}
