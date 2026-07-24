import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';

import { useMe, useUpdatePreferences } from '../auth/useAuth';
import { GUIDED_REPLAY_EVENT, guidedScreenFor, markSeen, wasSeen } from '../guided/guidedContent';
import { t } from '../i18n';

/**
 * Guided onboarding (D7): a paper-style interstitial shown the first time per
 * browser session a screen kind is opened, while the user's guided mode is on.
 * Continue marks the screen as seen; the quiet link switches guided mode off
 * for the account (persisted server-side, toggle in the user menu).
 */
export function GuidedOverlay() {
  const location = useLocation();
  const { data: user } = useMe();
  const preferences = useUpdatePreferences();
  // Re-evaluated on every navigation; dismissing bumps `tick` to re-render.
  const [, setTick] = useState(0);

  const screen = guidedScreenFor(location.pathname);
  const visible = Boolean(user?.guidedMode && screen && !wasSeen(screen.kind));

  useEffect(() => {
    function onReplay() {
      setTick((n) => n + 1);
    }
    window.addEventListener(GUIDED_REPLAY_EVENT, onReplay);
    return () => window.removeEventListener(GUIDED_REPLAY_EVENT, onReplay);
  }, []);

  useEffect(() => {
    if (!visible || !screen) {
      return;
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        dismiss();
      }
    }
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [visible, screen?.kind]);

  if (!visible || !screen) {
    return null;
  }

  function dismiss() {
    if (screen) {
      markSeen(screen.kind);
      setTick((n) => n + 1);
    }
  }

  function disableGuided() {
    dismiss();
    preferences.mutate({ guidedMode: false });
  }

  return createPortal(
    <div className="modal-overlay guided-overlay" onMouseDown={dismiss}>
      <div
        className="guided-card"
        role="dialog"
        aria-modal="true"
        aria-label={screen.title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <p className="guided-kicker">{t('guided.kicker')}</p>
        <h2 className="guided-title">{screen.title}</h2>
        <p className="guided-lead">{screen.lead}</p>

        <p className="guided-section-title">{t('guided.howTitle')}</p>
        <ul className="guided-list">
          {screen.how.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <p className="guided-section-title">{t('guided.futureTitle')}</p>
        <ul className="guided-list guided-future">
          {screen.future.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <div className="guided-actions">
          <button type="button" className="link guided-off" onClick={disableGuided}>
            {t('guided.disable')}
          </button>
          <span className="spacer" />
          <button type="button" onClick={dismiss} autoFocus>
            {t('guided.continue')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
