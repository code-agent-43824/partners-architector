import { useState } from 'react';

import type { Partner } from '../api/partners';
import type { SharesData } from '../api/scenario';
import { t } from '../i18n';

interface SharesEditorProps {
  partners: Partner[];
  value: SharesData | undefined;
  onChange: (next: SharesData) => void;
}

const BALANCED_EPSILON = 0.01;

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Block №5 — manual final shares (FR-5.1 manual mode, FR-5.7). One percentage
 * per partner with a live sum=100% check. The Gritz calculator (FR-5.3) is a
 * later phase; its mode is shown disabled («скоро») so its place is visible.
 */
export function SharesEditor({ partners, value, onChange }: SharesEditorProps) {
  // Raw input strings so a field can be cleared and retyped naturally; seeded
  // once from the stored shares. The parsed numbers drive the total + onChange.
  const [raw, setRaw] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      partners.map((p) => {
        const stored = value?.allocations.find((a) => a.partnerId === p.id)?.percent ?? 0;
        return [p.id, stored ? String(stored) : ''];
      }),
    ),
  );

  const parsed = (partnerId: string): number => {
    const n = Number.parseFloat(raw[partnerId] ?? '');
    return Number.isFinite(n) ? Math.min(Math.max(n, 0), 100) : 0;
  };
  const total = partners.reduce((sum, p) => sum + parsed(p.id), 0);
  const balanced = Math.abs(total - 100) < BALANCED_EPSILON;

  function edit(partnerId: string, next: string) {
    const rawNext = { ...raw, [partnerId]: next };
    setRaw(rawNext);
    onChange({
      mode: 'manual',
      allocations: partners.map((p) => {
        const n = Number.parseFloat(rawNext[p.id] ?? '');
        return { partnerId: p.id, percent: Number.isFinite(n) ? Math.min(Math.max(n, 0), 100) : 0 };
      }),
    });
  }

  if (partners.length === 0) {
    return <p className="muted">{t('shares.needPartners')}</p>;
  }

  return (
    <div className="shares field">
      <span className="field-label">{t('shares.title')}</span>
      <div className="mode-switch" role="group" aria-label={t('shares.title')}>
        <span className="mode-active" aria-current="true">
          {t('shares.manualMode')}
        </span>
        <span className="mode-soon" title={t('shares.calcSoonHint')}>
          {t('shares.calcMode')} <span className="badge badge-outline">{t('shares.soon')}</span>
        </span>
      </div>
      <table className="shares-table">
        <tbody>
          {partners.map((p) => (
            <tr key={p.id}>
              <td className="shares-name">{p.fullName}</td>
              <td className="shares-input">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  inputMode="decimal"
                  value={raw[p.id] ?? ''}
                  aria-label={p.fullName}
                  onChange={(event) => edit(p.id, event.target.value)}
                />
                <span className="pct">%</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={`shares-total ${balanced ? 'ok' : 'warn'}`}>
        {t('shares.total')}: {round(total)}%
        {balanced
          ? ` — ${t('shares.balanced')}`
          : ` (${t('shares.remaining')}: ${round(100 - total)}%)`}
      </p>
    </div>
  );
}
