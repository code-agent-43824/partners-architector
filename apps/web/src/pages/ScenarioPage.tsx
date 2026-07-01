import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import type { Partner } from '../api/partners';
import type { Clause, ClauseStatus } from '../api/scenario';
import { t, type TranslationKey } from '../i18n';
import {
  useClauses,
  useClauseVersions,
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

export function ScenarioPage() {
  const { partnershipId = '', sessionId = '' } = useParams();
  const query = useClauses(partnershipId, sessionId);
  const partnersQuery = usePartners(partnershipId);

  if (query.isLoading) {
    return <p className="muted">{t('common.loading')}</p>;
  }
  if (query.isError || !query.data) {
    return <p className="error">{t('common.error')}</p>;
  }

  const clauses = query.data;
  const partners = partnersQuery.data ?? [];
  const total = clauses.length;
  const agreed = clauses.filter((c) => c.status === 'agreed').length;
  const heavyOpen = clauses.filter(
    (c) => c.question.isSensitive && !OPEN_HEAVY_EXCLUDED.includes(c.status),
  ).length;
  const disputedParked = clauses.filter(
    (c) => c.status === 'disputed' || c.status === 'parked',
  ).length;

  return (
    <>
      <Link className="link" to={`/partnerships/${partnershipId}`}>
        {t('scenario.back')}
      </Link>
      <h1>{t('scenario.title')}</h1>
      <p className="muted">
        {t('scenario.agreedOf')}: {agreed} / {total} · {t('scenario.heavyOpen')}: {heavyOpen} ·{' '}
        {t('scenario.disputedParked')}: {disputedParked}
      </p>

      <ul className="list">
        {clauses.map((clause) => (
          <ClauseCard
            key={clause.id}
            partnershipId={partnershipId}
            sessionId={sessionId}
            clause={clause}
            partners={partners}
          />
        ))}
      </ul>
    </>
  );
}

interface ClauseCardProps {
  partnershipId: string;
  sessionId: string;
  clause: Clause;
  partners: Partner[];
}

function ClauseCard({ partnershipId, sessionId, clause, partners }: ClauseCardProps) {
  const update = useUpdateClause(partnershipId, sessionId);
  const signoff = useSetSignoff(partnershipId, sessionId);
  const [showVersions, setShowVersions] = useState(false);
  const versions = useClauseVersions(partnershipId, sessionId, clause.id, showVersions);
  const saveVersion = useSaveVersion(partnershipId, sessionId);
  const restoreVersion = useRestoreVersion(partnershipId, sessionId);
  const [text, setText] = useState(clause.text ?? '');
  const [rationale, setRationale] = useState(clause.rationale ?? '');
  const [saved, setSaved] = useState(false);
  const savedRef = useRef({ text: clause.text ?? '', rationale: clause.rationale ?? '' });

  // FR-4.1: autosave the formulation + rationale with a short debounce (≤ 2s).
  useEffect(() => {
    if (text === savedRef.current.text && rationale === savedRef.current.rationale) {
      return;
    }
    const handle = setTimeout(() => {
      update.mutate(
        { clauseId: clause.id, body: { text, rationale } },
        {
          onSuccess: () => {
            savedRef.current = { text, rationale };
            setSaved(true);
          },
        },
      );
    }, 1000);
    return () => clearTimeout(handle);
  }, [text, rationale, clause.id, update.mutate]);

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
      if (!window.confirm(t('scenario.naWarning'))) {
        return;
      }
      const reason = window.prompt(t('scenario.naReasonPrompt'), clause.naReason ?? '');
      if (!reason || !reason.trim()) {
        return;
      }
      update.mutate({ clauseId: clause.id, body: { status, naReason: reason.trim() } });
      return;
    }
    if (status === 'agreed') {
      // Include the current text so the API's agreed-requires-text guard sees it.
      update.mutate({ clauseId: clause.id, body: { status, text, rationale } });
      return;
    }
    update.mutate({ clauseId: clause.id, body: { status } });
  }

  function onRestore(versionId: string) {
    if (!window.confirm(t('history.restoreConfirm'))) {
      return;
    }
    restoreVersion.mutate(
      { clauseId: clause.id, versionId },
      {
        onSuccess: (updated) => {
          setText(updated.text ?? '');
          setRationale(updated.rationale ?? '');
          savedRef.current = { text: updated.text ?? '', rationale: updated.rationale ?? '' };
          setSaved(false);
        },
      },
    );
  }

  const hasText = text.trim().length > 0;
  const signoffByPartner = new Map(clause.signoffs.map((s) => [s.partnerId, s]));
  const allAgreed =
    partners.length > 0 && partners.every((p) => signoffByPartner.get(p.id)?.agreed);

  return (
    <li className="card clause">
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

      {clause.question.prompt ? <p>{clause.question.prompt}</p> : null}
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
        <p className="muted">
          {t('scenario.naReasonLabel')}: {clause.naReason}
        </p>
      ) : null}

      <label>
        {t('capture.textLabel')}
        <textarea value={text} onChange={(event) => editText(event.target.value)} rows={3} />
      </label>
      <label>
        {t('capture.rationaleLabel')}
        <textarea
          value={rationale}
          onChange={(event) => editRationale(event.target.value)}
          rows={2}
        />
      </label>

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
        <span className="muted save-state">
          {update.isPending ? t('capture.saving') : saved ? t('capture.saved') : ''}
        </span>
      </div>
      {update.isError ? <p className="error">{t('common.error')}</p> : null}

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
                  {version.text ? (
                    <span className="muted"> — {version.text.slice(0, 80)}</span>
                  ) : null}
                </span>
                <button
                  type="button"
                  className="link"
                  disabled={restoreVersion.isPending}
                  onClick={() => onRestore(version.id)}
                >
                  {t('history.restore')}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </li>
  );
}
