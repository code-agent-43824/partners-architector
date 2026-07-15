import { Link, Outlet, useNavigate } from 'react-router-dom';

import { useLogout } from '../auth/useAuth';
import { t } from '../i18n';
import { ConnectionBanner } from './ConnectionBanner';
import { GuidedOverlay } from './GuidedOverlay';
import { UserMenu } from './UserMenu';

export function AppLayout() {
  const navigate = useNavigate();
  const logout = useLogout();

  return (
    <div className="page">
      <header className="topbar">
        <Link className="brand" to="/">
          {t('appName')}
        </Link>
        <span className="spacer" />
        <UserMenu />
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
      <GuidedOverlay />
    </div>
  );
}
