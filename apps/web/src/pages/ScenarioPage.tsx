import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { apiErrorMessage } from '../api/errors';
import type { Partner } from '../api/partners';
import type { Clause, ClauseStatus, StructuredData, UpdateClauseInput } from '../api/scenario';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { MeaningEditor } from '../components/MeaningEditor';
import { Modal } from '../components/Modal';
import { RichTextEditor } from '../components/RichTextEditor';
import { SharesEditor } from '../components/SharesEditor';
import { t, type TranslationKey } from '../i18n';
import {
  useClauses,
  useClauseVersions,
  useFlushClause,
  useRestoreVersion,
  useSaveVersion,
  useSetSignoff,
  useUpdateClause,
} from '../partnerships/clauseHooks';
import { usePartners } from '../partnerships/partnerHooks';

const STATUSES: ClauseStatus[] = [
  'not_started',
  'in_progress',
  'parked',
  'agreed',
  'disputed',
  'not_applicable',
];

const statusLabelKey: Record<ClauseStatus, TranslationKey> = {
  not_started: 'scenario.status.not_started',
  in_progress: 'scenario.status.in_progress',
  parked: 'scenario.status.parked',
  agreed: 'scenario.status.agreed',
  disputed: 'scenario.status.disputed',
  not_applicable: 'scenario.status.not_applicable',
};

const OPEN_HEAVY_EXCLUDED: ClauseStatus[] = ['agreed', 'not_applicable'];

// Methodology blocks with structured capture (spec §4.5): №5 final shares
// (FR-5.7), №6 «смысл долей» flags (FR-5.8).
const SHARES_BLOCK = 5;
const MEANING_BLOCK = 6;

interface SavedSnapshot {
  text: string;
  rationale: string;
  structured: string;
}

/** A PATCH body of only the capture fields that changed since the last save. */
function changedBody(
  saved: SavedSnapshot,
  next: { text: string; rationale: string; structuredData: StructuredData },
): UpdateClauseInput | null {
  const body: UpdateClauseInput = {};
  if (next.text !== saved.text) {
    body.text = next.text;
  }
  if (next.rationale !== saved.rationale) {
    body.rationale = next.rationale;
  }
  if (JSON.stringify(next.structuredData) !== saved.structured) {
    body.structuredData = next.structuredData;
  }
  return Object.keys(body).length > 0 ? body : null;
}

/** Plain-text preview of a stored formulation (which may be TipTap HTML). */
function previewText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

export function ScenarioPage() {
  const { partnershipId = '', sessionId = '' } = useParams();
  const query = useClauses(partnershipId, sessionId);
  const partnersQuery = usePartners(partnershipId);
  const clauses = query.data;
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Resolve the focused block (default: the first) from the loaded list.
  const selectedIndex = useMemo(() => {
    if (!clauses || clauses.length === 0) {
      return 0;
    }
    const i = clauses.findIndex((c) => c.id === selectedId);
    return i >= 0 ? i : 0;
  }, [clauses, selectedId]);

  // FR-3.2: linear forward/back navigation between blocks.
  const go = useCallback(
    (delta: number) => {
      if (!clauses || clauses.length === 0) {
        return;
      }
      const next = Math.min(Math.max(selectedIndex + delta, 0), clauses.length - 1);
      const target = clauses[next];
      if (target) {
        setSelectedId(target.id);
      }
    },
    [clauses, selectedIndex],
  );

  // Keyboard navigation — only when not typing and no dialog is open.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (document.querySelector('.modal-overlay')) {
        return;
      }
      const el = event.target as HTMLElement | null;
      if (
        el &&
        (el.isContentEditable ||
          el.tagName === 'INPUT' ||
          el.tagName === 'TEXTAREA' ||
          el.tagName === 'SELECT')
      ) {
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        go(-1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        go(1);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [go]);

  if (query.isLoading) {
    return <p className="muted">{t('common.loading')}</p>;
  }
  if (query.isError || !clauses) {
    return <p className="error">{t('common.error')}</p>;
  }

  const partners = partnersQuery.data ?? [];
  const total = clauses.length;
  const agreed = clauses.filter((c) => c.status === 'agreed').length;
  const heavyOpen = clauses.filter(
    (c) => c.question.isSensitive && !OPEN_HEAVY_EXCLUDED.includes(c.status),
  ).length;
  const disputedParked = clauses.filter(
    (c) => c.status === 'disputed' || c.status === 'parked',
  ).length;

  // Table of contents grouped by contour (category), preserving block order.
  const groups: { category: string; items: Clause[] }[] = [];
  for (const clause of clauses) {
    const category = clause.question.category;
    let group = groups.find((g) => g.category === category);
    if (!group) {
      group = { category, items: [] };
      groups.push(group);
    }
    group.items.push(clause);
  }

  const selected = clauses[selectedIndex];

  return (
    <>
      <Link className="link" to={`/partnerships/${partnershipId}`}>
        {t('scenario.back')}
      </Link>
      <h1>{t('scenario.title')}</h1>
      <p className="muted progress">
        {t('scenario.agreedOf')}: {agreed} / {total} · {t('scenario.heavyOpen')}: {heavyOpen} ·{' '}
        {t('scenario.disputedParked')}: {disputedParked}
      </p>
      <p>
        <Link
          className="link"
          to={`/partnerships/${partnershipId}/sessions/${sessionId}/agreement`}
        >
          {t('agreement.assemble')}
        </Link>
      </p>

      {selected ? (
        <div className="scenario">
          <nav className="toc" aria-label={t('scenario.tocTitle')}>
            {groups.map((group) => (
              <div key={group.category} className="toc-group">
                <p className="toc-group-title">{group.category}</p>
                {group.items.map((clause) => (
                  <button
                    key={clause.id}
                    type="button"
                    className={`toc-item${clause.id === selected.id ? ' active' : ''}`}
                    aria-current={clause.id === selected.id ? 'true' : undefined}
                    onClick={() => setSelectedId(clause.id)}
                  >
                    <span
                      className={`dot dot-${clause.status}`}
                      title={t(statusLabelKey[clause.status])}
                    />
                    <span className="toc-num">{clause.question.number}</span>
                    <span className="toc-item-title">{clause.question.title}</span>
                    {clause.question.isSensitive ? (
                      <span className="toc-heavy" title={t('scenario.heavyBadge')}>
                        ⬤
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            ))}
          </nav>

          <div className="focus">
            <div className="focus-nav">
              <button
                type="button"
                className="link"
                disabled={selectedIndex === 0}
                onClick={() => go(-1)}
              >
                {t('scenario.prevBlock')}
              </button>
              <span className="focus-counter">
                {t('scenario.blockLabel')} {selectedIndex + 1} / {total}
              </span>
              <button
                type="button"
                className="link"
                disabled={selectedIndex === total - 1}
                onClick={() => go(1)}
              >
                {t('scenario.nextBlock')}
              </button>
              <span className="spacer" />
              <span className="muted kbd-hint">{t('scenario.kbdHint')}</span>
            </div>

            <ClauseCard
              key={selected.id}
              partnershipId={partnershipId}
              sessionId={sessionId}
              clause={selected}
              partners={partners}
            />
          </div>
        </div>
      ) : (
        <p className="muted">{t('sessions.empty')}</p>
      )}
    </>
  );
}

interface ClauseCardProps {
  partnershipId: string;
  sessionId: string;
  clause: Clause;
  partners: Partner[];
}

type Dialog = { kind: 'na' } | { kind: 'restore'; versionId: string } | null;

function ClauseCard({ partnershipId, sessionId, clause, partners }: ClauseCardProps) {
  const update = useUpdateClause(partnershipId, sessionId);
  const flush = useFlushClause(partnershipId, sessionId);
  const signoff = useSetSignoff(partnershipId, sessionId);
  const [showVersions, setShowVersions] = useState(false);
  const versions = useClauseVersions(partnershipId, sessionId, clause.id, showVersions);
  const saveVersion = useSaveVersion(partnershipId, sessionId);
  const restoreVersion = useRestoreVersion(partnershipId, sessionId);
  const [text, setText] = useState(clause.text ?? '');
  const [rationale, setRationale] = useState(clause.rationale ?? '');
  const [structuredData, setStructuredData] = useState<StructuredData>(clause.structuredData ?? {});
  const [saved, setSaved] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [naReason, setNaReason] = useState(clause.naReason ?? '');
  const savedRef = useRef({
    text: clause.text ?? '',
    rationale: clause.rationale ?? '',
    structured: JSON.stringify(clause.structuredData ?? {}),
  });
  const latestRef = useRef({ text, rationale, structuredData });
  latestRef.current = { text, rationale, structuredData };

  // FR-4.1/5.7: autosave changed capture fields with a short debounce (≤ 2s).
  useEffect(() => {
    const body = changedBody(savedRef.current, { text, rationale, structuredData });
    if (!body) {
      return;
    }
    const handle = setTimeout(() => {
      update.mutate(
        { clauseId: clause.id, body },
        {
          onSuccess: () => {
            savedRef.current = { text, rationale, structured: JSON.stringify(structuredData) };
            setSaved(true);
          },
        },
      );
    }, 1000);
    return () => clearTimeout(handle);
  }, [text, rationale, structuredData, clause.id, update.mutate]);

  // Flush any pending edit when the focused block unmounts (block switch).
  useEffect(() => {
    return () => {
      const latest = latestRef.current;
      const body = changedBody(savedRef.current, latest);
      if (body) {
        flush(clause.id, body);
      }
    };
  }, [flush, clause.id]);

  function editText(value: string) {
    setSaved(false);
    setText(value);
  }

  function editRationale(value: string) {
    setSaved(false);
    setRationale(value);
  }

  function onStatusChange(status: ClauseStatus) {
    if (status === clause.status) {
      return;
    }
    if (status === 'not_applicable') {
      setNaReason(clause.naReason ?? '');
      setDialog({ kind: 'na' });
      return;
    }
    if (status === 'agreed') {
      // Include the current text so the API's agreed-requires-text guard sees it.
      update.mutate({ clauseId: clause.id, body: { status, text, rationale } });
      return;
    }
    update.mutate({ clauseId: clause.id, body: { status } });
  }

  function confirmNa() {
    const reason = naReason.trim();
    if (!reason) {
      return;
    }
    update.mutate(
      { clauseId: clause.id, body: { status: 'not_applicable', naReason: reason } },
      { onSuccess: () => setDialog(null) },
    );
  }

  function confirmRestore(versionId: string) {
    restoreVersion.mutate(
      { clauseId: clause.id, versionId },
      {
        onSuccess: (updated) => {
          setText(updated.text ?? '');
          setRationale(updated.rationale ?? '');
          savedRef.current = {
            text: updated.text ?? '',
            rationale: updated.rationale ?? '',
            structured: savedRef.current.structured,
          };
          setSaved(false);
          setDialog(null);
        },
      },
    );
  }

  const hasText = text.trim().length > 0;
  const signoffByPartner = new Map(clause.signoffs.map((s) => [s.partnerId, s]));
  const allAgreed =
    partners.length > 0 && partners.every((p) => signoffByPartner.get(p.id)?.agreed);

  return (
    <div className="card clause">
      <div className="clause-head">
        <strong>
          {clause.question.number}. {clause.question.title}
        </strong>
        <span className="badge badge-outline">{clause.question.category}</span>
        {clause.question.isSensitive ? (
          <span className="badge badge-heavy">{t('scenario.heavyBadge')}</span>
        ) : null}
        <span className={`badge badge-${clause.status}`}>{t(statusLabelKey[clause.status])}</span>
      </div>

      {clause.question.prompt ? <p className="clause-prompt">{clause.question.prompt}</p> : null}
      {clause.question.helperQuestions.length > 0 ? (
        <ul className="helpers">
          {clause.question.helperQuestions.map((helper) => (
            <li key={helper} className="muted">
              {helper}
            </li>
          ))}
        </ul>
      ) : null}

      {clause.status === 'not_applicable' && clause.naReason ? (
        <p className="muted na-reason">
          {t('scenario.naReasonLabel')}: {clause.naReason}
        </p>
      ) : null}

      <div className="field">
        <span className="field-label">{t('capture.textLabel')}</span>
        <RichTextEditor value={text} onChange={editText} ariaLabel={t('capture.textLabel')} />
      </div>
      <label>
        {t('capture.rationaleLabel')}
        <textarea
          value={rationale}
          onChange={(event) => editRationale(event.target.value)}
          rows={2}
        />
      </label>

      {clause.question.number === SHARES_BLOCK ? (
        <SharesEditor
          partners={partners}
          value={structuredData.shares}
          onChange={(shares) => {
            setSaved(false);
            setStructuredData((prev) => ({ ...prev, shares }));
          }}
        />
      ) : null}
      {clause.question.number === MEANING_BLOCK ? (
        <MeaningEditor
          value={structuredData.meaning}
          onChange={(meaning) => {
            setSaved(false);
            setStructuredData((prev) => ({ ...prev, meaning }));
          }}
        />
      ) : null}

      {partners.length > 0 ? (
        <div className="signoffs">
          <span className="muted">{t('capture.signoffs')}:</span>
          {partners.map((partner) => (
            <label key={partner.id} className="checkbox">
              <input
                type="checkbox"
                checked={signoffByPartner.get(partner.id)?.agreed ?? false}
                disabled={signoff.isPending}
                onChange={(event) =>
                  signoff.mutate({
                    clauseId: clause.id,
                    partnerId: partner.id,
                    agreed: event.target.checked,
                  })
                }
              />
              {partner.fullName}
            </label>
          ))}
          {allAgreed ? <span className="badge badge-agreed">{t('capture.confirmed')}</span> : null}
        </div>
      ) : null}

      <div className="clause-foot">
        <label className="status-control">
          {t('scenario.statusLabel')}
          <select
            value={clause.status}
            disabled={update.isPending}
            onChange={(event) => onStatusChange(event.target.value as ClauseStatus)}
          >
            {STATUSES.map((status) => (
              <option key={status} value={status} disabled={status === 'agreed' && !hasText}>
                {t(statusLabelKey[status])}
              </option>
            ))}
          </select>
        </label>
        <span className={`save-state ${update.isError ? 'save-error' : 'muted'}`}>
          {update.isPending
            ? t('capture.saving')
            : update.isError
              ? apiErrorMessage(update.error)
              : saved
                ? t('capture.saved')
                : ''}
        </span>
        {update.isError && update.variables ? (
          <button
            type="button"
            className="link"
            onClick={() => update.variables && update.mutate(update.variables)}
          >
            {t('common.retry')}
          </button>
        ) : null}
      </div>

      <div className="versions">
        <button type="button" className="link" onClick={() => setShowVersions((value) => !value)}>
          {showVersions ? t('history.hide') : t('history.show')}
        </button>
        <button
          type="button"
          className="link"
          disabled={saveVersion.isPending}
          onClick={() => saveVersion.mutate({ clauseId: clause.id })}
        >
          {t('history.save')}
        </button>
        {showVersions ? (
          <ul className="list versions-list">
            {versions.isLoading ? <li className="muted">{t('common.loading')}</li> : null}
            {versions.data && versions.data.length === 0 ? (
              <li className="muted">{t('history.empty')}</li>
            ) : null}
            {(versions.data ?? []).map((version) => (
              <li key={version.id} className="list-item">
                <span className="partner-name">
                  {new Date(version.editedAt).toLocaleString('ru-RU')} ·{' '}
                  {t(statusLabelKey[version.status])}
                  {version.note ? ` · ${version.note}` : ''}
                  {version.text && previewText(version.text) ? (
                    <span className="muted"> — {previewText(version.text)}</span>
                  ) : null}
                </span>
                <button
                  type="button"
                  className="link"
                  disabled={restoreVersion.isPending}
                  onClick={() => setDialog({ kind: 'restore', versionId: version.id })}
                >
                  {t('history.restore')}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {dialog?.kind === 'na' ? (
        <Modal
          title={t('scenario.naDialogTitle')}
          onClose={() => setDialog(null)}
          footer={
            <>
              <button type="button" className="link" onClick={() => setDialog(null)}>
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="danger"
                disabled={!naReason.trim() || update.isPending}
                onClick={confirmNa}
              >
                {t('scenario.naConfirm')}
              </button>
            </>
          }
        >
          <p className="warn-text">{t('scenario.naWarning')}</p>
          <label className="field">
            <span className="field-label">{t('scenario.naReasonLabel')}</span>
            <textarea
              autoFocus
              rows={3}
              value={naReason}
              onChange={(event) => setNaReason(event.target.value)}
              placeholder={t('scenario.naReasonPrompt')}
            />
          </label>
          {update.isError ? <p className="error">{apiErrorMessage(update.error)}</p> : null}
        </Modal>
      ) : null}

      {dialog?.kind === 'restore' ? (
        <ConfirmDialog
          title={t('history.restoreTitle')}
          message={t('history.restoreConfirm')}
          confirmLabel={t('history.restore')}
          danger
          busy={restoreVersion.isPending}
          onCancel={() => setDialog(null)}
          onConfirm={() => confirmRestore(dialog.versionId)}
        />
      ) : null}
    </div>
  );
}
