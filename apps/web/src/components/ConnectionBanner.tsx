import { useEffect, useState } from 'react';

import { t } from '../i18n';

/**
 * Global "connection lost" indicator (NFR-3): when the browser reports it is
 * offline, autosave cannot reach the API, so surface it instead of failing
 * silently. Hidden while online.
 */
export function ConnectionBanner() {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (online) {
    return null;
  }
  return (
    <div className="conn-banner" role="status">
      {t('connection.offline')}
    </div>
  );
}
