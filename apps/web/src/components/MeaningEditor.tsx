import type { MeaningData } from '../api/scenario';
import { t, type TranslationKey } from '../i18n';

const DIMENSIONS: { key: keyof MeaningData; label: TranslationKey }[] = [
  { key: 'voting', label: 'meaning.voting' },
  { key: 'profit', label: 'meaning.profit' },
  { key: 'ownership', label: 'meaning.ownership' },
  { key: 'losses', label: 'meaning.losses' },
];

const EMPTY: MeaningData = { voting: false, profit: false, ownership: false, losses: false };

interface MeaningEditorProps {
  value: MeaningData | undefined;
  onChange: (next: MeaningData) => void;
}

/**
 * Block №6 — «смысл долей» (FR-5.8): which dimensions the ownership shares
 * actually govern. Structured flags; nuance stays in the free-text formulation.
 */
export function MeaningEditor({ value, onChange }: MeaningEditorProps) {
  const current = value ?? EMPTY;
  return (
    <fieldset className="meaning field">
      <legend className="field-label">{t('meaning.title')}</legend>
      <div className="meaning-flags">
        {DIMENSIONS.map((dim) => (
          <label key={dim.key} className="checkbox">
            <input
              type="checkbox"
              checked={current[dim.key]}
              onChange={(event) => onChange({ ...current, [dim.key]: event.target.checked })}
            />
            {t(dim.label)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
