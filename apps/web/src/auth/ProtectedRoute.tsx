import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import { t } from '../i18n';
import { useMe } from './useAuth';

/** Renders children only for an authenticated user; otherwise redirects to /login. */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { data, isLoading, isError } = useMe();

  if (isLoading) {
    return <div className="centered muted">{t('common.loading')}</div>;
  }
  if (isError || !data) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
