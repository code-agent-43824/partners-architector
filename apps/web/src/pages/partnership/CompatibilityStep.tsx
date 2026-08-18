import { type ChangeEvent, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  activeImport,
  BLOCK_LABELS,
  CONSTRUCTS,
  type ConstructBlock,
  type TestImport,
  type Zone,
} from '../../compat/constructs';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { t } from '../../i18n';
import {
  useDeleteTestImport,
  useTestImports,
  useUpdateZones,
  useUploadTestImport,
  type ZoneMark,
} from '../../partnerships/compatHooks';

/**
 * Step 3 of the partnership card (D9): import ПЕСП compatibility-test
 * results. Any file is accepted (the official export format is not known
 * yet); our provisional psa-pesp-v0 JSON is recognized immediately, anything
 * else can be zone-marked by hand. Yellow/red zones adapt the session
 * scenario (TOC markers + in-block callouts).
 */
export function CompatibilityStep() {
  const { id = '' } = useParams();
  const imports = useTestImports(id);
  const upload = useUploadTestImport(id);
  const remove = useDeleteTestImport(id);
  const fileRef = useRef<HTMLInputElement>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const active = activeImport(imports.data);

  function onFileChosen(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      upload.mutate(file);
    }
    event.target.value = '';
  }

  return (
    <>
      <section className="card compat-intro">
        <p>{t('compat.lead')}</p>
        <p className="muted">{t('compat.privacy')}</p>
      </section>

      <section className="card compat-imports">
        <div className="compat-imports-head">
          <h3>{t('compat.importsTitle')}</h3>
          <input
            ref={fileRef}
            type="file"
            className="visually-hidden"
            onChange={onFileChosen}
            aria-hidden="true"
            tabIndex={-1}
          />
          <button
            type="button"
            disabled={upload.isPending}
            onClick={() => fileRef.current?.click()}
          >
            {upload.isPending ? t('compat.importBusy') : t('compat.importButton')}
          </button>
        </div>
        {upload.isError ? <p className="error">{t('compat.uploadError')}</p> : null}

        {imports.data && imports.data.length > 0 ? (
          <ul className="compat-import-list">
            {imports.data.map((record) => (
              <li key={record.id} className="compat-import-row">
                <span className="compat-file">{record.fileName}</span>
                <span className="muted">
                  {new Date(record.uploadedAt).toLocaleDateString('ru-RU')} ·{' '}
                  {formatSize(record.sizeBytes)}
                </span>
                {record.status === 'parsed' ? (
                  <span className="badge badge-agreed">{t('compat.statusParsed')}</span>
                ) : (
                  <span className="badge badge-outline">{t('compat.statusReceived')}</span>
                )}
                {record.id === active?.id ? (
                  <span className="badge badge-active">{t('compat.activeBadge')}</span>
                ) : null}
                <span className="spacer" />
                <button type="button" className="quiet" onClick={() => setDeleteId(record.id)}>
                  {t('compat.deleteImport')}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">{t('compat.emptyList')}</p>
        )}
        {active && active.status === 'received' ? (
          <p className="muted compat-received-hint">{t('compat.receivedHint')}</p>
        ) : null}
      </section>

      {active ? <ReportSummary record={active} /> : null}
      {active ? <ZonesEditor key={active.id} partnershipId={id} record={active} /> : null}

      <div className="step-cta">
        <span className="muted">{t('compat.optionalNote')}</span>
        <Link className="button-primary" to={`/partnerships/${id}/sessions`}>
          {t('steps.nextSessions')}
        </Link>
      </div>

      {deleteId ? (
        <ConfirmDialog
          title={t('compat.deleteImport')}
          message={t('compat.deleteConfirm')}
          confirmLabel={t('compat.deleteImport')}
          danger
          busy={remove.isPending}
          onCancel={() => setDeleteId(null)}
          onConfirm={() =>
            remove.mutate(deleteId, {
              onSuccess: () => setDeleteId(null),
            })
          }
        />
      ) : null}
    </>
  );
}

/** Parsed-report header: ПЕСП score, level, partners, zone counts. */
function ReportSummary({ record }: { record: TestImport }) {
  const payload = record.payload;
  if (!payload) {
    return null;
  }
  const reds = payload.constructs.filter((c) => c.zone === 'red');
  const yellows = payload.constructs.filter((c) => c.zone === 'yellow');
  return (
    <section className="card compat-summary">
      <h3>{t('compat.summaryTitle')}</h3>
      <div className="compat-score-row">
        {payload.score !== undefined ? (
          <div className="compat-score">
            <span className="compat-score-value">{Math.round(payload.score)}</span>
            <span className="muted">
              {t('compat.scoreLabel')}
              {payload.level ? ` · ${t('compat.levelLabel')} ${payload.level}` : ''}
            </span>
          </div>
        ) : null}
        {payload.partners && payload.partners.length > 0 ? (
          <p className="muted">
            {t('compat.partnersLabel')}: {payload.partners.join(' + ')}
          </p>
        ) : null}
      </div>
      {reds.length + yellows.length > 0 ? (
        <ul className="compat-zone-list">
          {[...reds, ...yellows].map((construct) => (
            <li key={construct.code}>
              <span className={`zone-chip zone-${construct.zone}`} />
              <span>{construct.name}</span>
              {construct.values ? (
                <span className="muted"> — {construct.values.map(Math.round).join(' | ')}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">{t('compat.noZones')}</p>
      )}
    </section>
  );
}

const ZONE_OPTIONS: { value: Zone | null; labelKey: Parameters<typeof t>[0] }[] = [
  { value: null, labelKey: 'compat.zoneUnset' },
  { value: 'green', labelKey: 'compat.zoneGreen' },
  { value: 'yellow', labelKey: 'compat.zoneYellow' },
  { value: 'red', labelKey: 'compat.zoneRed' },
];

/**
 * Manual zone marking over the draft 32-construct reference. Constructs the
 * parsed file carries under codes we do not know are preserved on save.
 */
function ZonesEditor({ partnershipId, record }: { partnershipId: string; record: TestImport }) {
  const save = useUpdateZones(partnershipId);
  const payloadByCode = useMemo(
    () => new Map((record.payload?.constructs ?? []).map((c) => [c.code, c])),
    [record.payload],
  );
  const [zones, setZones] = useState<Map<string, Zone>>(() => {
    const initial = new Map<string, Zone>();
    for (const construct of CONSTRUCTS) {
      const fromPayload = payloadByCode.get(construct.code);
      if (fromPayload) {
        initial.set(construct.code, fromPayload.zone);
      }
    }
    return initial;
  });
  const [saved, setSaved] = useState(false);

  function setZone(code: string, zone: Zone | null) {
    setSaved(false);
    setZones((prev) => {
      const next = new Map(prev);
      if (zone === null) {
        next.delete(code);
      } else {
        next.set(code, zone);
      }
      return next;
    });
  }

  function onSave() {
    const marks: ZoneMark[] = [];
    for (const construct of CONSTRUCTS) {
      const zone = zones.get(construct.code);
      if (zone) {
        marks.push({ code: construct.code, name: construct.name, zone });
      }
    }
    // Keep parsed constructs we have no reference row for.
    for (const construct of record.payload?.constructs ?? []) {
      if (!CONSTRUCTS.some((ref) => ref.code === construct.code)) {
        marks.push({ code: construct.code, name: construct.name, zone: construct.zone });
      }
    }
    save.mutate({ importId: record.id, constructs: marks }, { onSuccess: () => setSaved(true) });
  }

  const blocks: ConstructBlock[] = ['difference', 'parity', 'match'];

  return (
    <section className="card compat-zones">
      <h3>{t('compat.zonesTitle')}</h3>
      <p className="muted">{t('compat.zonesHint')}</p>
      {blocks.map((block) => (
        <div key={block} className="compat-zone-group">
          <p className="compat-zone-group-title">{BLOCK_LABELS[block]}</p>
          {CONSTRUCTS.filter((construct) => construct.block === block).map((construct) => {
            const current = zones.get(construct.code) ?? null;
            const values = payloadByCode.get(construct.code)?.values;
            return (
              <div key={construct.code} className="compat-zone-row">
                <span className="compat-zone-name">
                  {construct.name}
                  {values ? (
                    <span className="muted"> — {values.map(Math.round).join(' | ')}</span>
                  ) : null}
                </span>
                <span
                  className="zone-picker"
                  role="radiogroup"
                  aria-label={`${t('compat.zonesTitle')}: ${construct.name}`}
                >
                  {ZONE_OPTIONS.map((option) => (
                    <button
                      key={option.labelKey}
                      type="button"
                      role="radio"
                      aria-checked={current === option.value}
                      className={`zone-option${current === option.value ? ' selected' : ''}${
                        option.value ? ` zone-${option.value}` : ''
                      }`}
                      onClick={() => setZone(construct.code, option.value)}
                    >
                      {t(option.labelKey)}
                    </button>
                  ))}
                </span>
              </div>
            );
          })}
        </div>
      ))}
      <div className="form-actions">
        <button type="button" disabled={save.isPending} onClick={onSave}>
          {t('compat.saveZones')}
        </button>
        {saved ? <span className="muted">{t('compat.zonesSaved')}</span> : null}
        {save.isError ? <span className="error">{t('common.error')}</span> : null}
      </div>
    </section>
  );
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} КБ`;
}
