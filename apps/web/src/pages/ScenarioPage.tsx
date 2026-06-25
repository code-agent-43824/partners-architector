import { Link, useParams } from 'react-router-dom';

import type { Clause, ClauseStatus } from '../api/scenario';
import { t, type TranslationKey } from '../i18n';
import { useClauses, useUpdateClauseStatus } from '../partnerships/clauseHooks';

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

  if (query.isLoading) {
    return <p className="muted">{t('common.loading')}</p>;
  }
  if (query.isError || !query.data) {
    return <p className="error">{t('common.error')}</p>;
  }

  const clauses = query.data;
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
}

function ClauseCard({ partnershipId, sessionId, clause }: ClauseCardProps) {
  const update = useUpdateClauseStatus(partnershipId, sessionId);

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
    update.mutate({ clauseId: clause.id, body: { status } });
  }

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

      <label className="status-control">
        {t('scenario.statusLabel')}
        <select
          value={clause.status}
          disabled={update.isPending}
          onChange={(event) => onStatusChange(event.target.value as ClauseStatus)}
        >
          {STATUSES.map((status) => (
            <option
              key={status}
              value={status}
              disabled={status === 'agreed' && !clause.text?.trim()}
            >
              {t(statusLabelKey[status])}
            </option>
          ))}
        </select>
      </label>
      {update.isError ? <p className="error">{t('common.error')}</p> : null}
    </li>
  );
}
