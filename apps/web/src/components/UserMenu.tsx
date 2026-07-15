import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { useMe, useUpdatePreferences } from '../auth/useAuth';
import { t } from '../i18n';

/**
 * Minimal per-user settings (D7): a dropdown next to the logout button.
 * Contents today: the guided-mode toggle and the profile link.
 */
export function UserMenu() {
  const { data: user } = useMe();
  const preferences = useUpdatePreferences();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onDocMouseDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) {
    return null;
  }

  return (
    <div className="user-menu" ref={rootRef}>
      <button
        type="button"
        className="user-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {user.email}
        <span className="chevron" aria-hidden="true">
          ▾
        </span>
      </button>
      {open ? (
        <div className="user-menu-panel" role="menu">
          <label className="checkbox user-menu-item">
            <input
              type="checkbox"
              checked={user.guidedMode}
              onChange={(event) => preferences.mutate({ guidedMode: event.target.checked })}
            />
            <span>
              {t('userMenu.guided')}
              <span className="user-menu-hint">{t('userMenu.guidedHint')}</span>
            </span>
          </label>
          <div className="user-menu-sep" />
          <Link
            className="link user-menu-item"
            to="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            {t('nav.profile')}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
