import { Link, Outlet, useNavigate } from 'react-router-dom';

import { useLogout, useMe } from '../auth/useAuth';
import { t } from '../i18n';
import { ConnectionBanner } from './ConnectionBanner';

export function AppLayout() {
  const navigate = useNavigate();
  const { data: user } = useMe();
  const logout = useLogout();

  return (
    <div className="page">
      <header className="topbar">
        <Link className="brand" to="/">
          {t('appName')}
        </Link>
        <span className="spacer" />
        {user ? <span className="muted">{user.email}</span> : null}
        <Link className="link" to="/profile">
          {t('nav.profile')}
        </Link>
        <button
          type="button"
          onClick={() =>
            logout.mutate(undefined, { onSuccess: () => navigate('/login', { replace: true }) })
          }
        >
          {t('nav.logout')}
        </button>
      </header>
      <ConnectionBanner />
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
