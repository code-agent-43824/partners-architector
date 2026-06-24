import { type FormEvent, useState } from 'react';

import { MIN_PARTNERS } from '../api/partners';
import type { Session, SessionKind } from '../api/sessions';
import { t, type TranslationKey } from '../i18n';
import { usePartners } from '../partnerships/partnerHooks';
import {
  useCompleteSession,
  useCreateSession,
  useDeleteSession,
  useSessions,
  useStartSession,
} from '../partnerships/sessionHooks';

const kindLabelKey: Record<SessionKind, TranslationKey> = {
  initial: 'sessions.kind.initial',
  review: 'sessions.kind.review',
};
const statusLabelKey: Record<Session['status'], TranslationKey> = {
  draft: 'sessions.status.draft',
  in_progress: 'sessions.status.in_progress',
  completed: 'sessions.status.completed',
};

function sessionLabel(session: Session): string {
  return session.title?.trim() ? session.title : t(kindLabelKey[session.kind]);
}

export function SessionsSection({ partnershipId }: { partnershipId: string }) {
  const list = useSessions(partnershipId);
  const partners = usePartners(partnershipId);
  const create = useCreateSession(partnershipId);
  const start = useStartSession(partnershipId);
  const complete = useCompleteSession(partnershipId);
  const remove = useDeleteSession(partnershipId);

  const [kind, setKind] = useState<SessionKind>('initial');
  const [title, setTitle] = useState('');
  const [baselineSessionId, setBaselineSessionId] = useState('');

  const sessions = list.data ?? [];
  const partnerCount = partners.data?.length ?? 0;
  const canStart = partnerCount >= MIN_PARTNERS;
  const reviewWithoutBaseline = kind === 'review' && !baselineSessionId;

  function onCreate(event: FormEvent) {
    event.preventDefault();
    create.mutate(
      {
        kind,
        title: title.trim() || undefined,
        baselineSessionId: kind === 'review' ? baselineSessionId : undefined,
      },
      {
        onSuccess: () => {
          setTitle('');
          setBaselineSessionId('');
        },
      },
    );
  }

  return (
    <section>
      <h2>{t('sessions.title')}</h2>
      {partnerCount < MIN_PARTNERS ? <p className="muted">{t('sessions.needPartners')}</p> : null}
      {list.isLoading ? <p className="muted">{t('common.loading')}</p> : null}
      {list.isError ? <p className="error">{t('common.error')}</p> : null}
      {list.data && sessions.length === 0 ? <p className="muted">{t('sessions.empty')}</p> : null}

      <ul className="list">
        {sessions.map((session) => (
          <li key={session.id} className="list-item">
            <span className="partner-name">
              {sessionLabel(session)}
              <span className="muted"> · {t(kindLabelKey[session.kind])}</span>
            </span>
            <span className={`badge badge-${session.status}`}>
              {t(statusLabelKey[session.status])}
            </span>
            <div className="partner-actions">
              {session.status === 'draft' ? (
                <button
                  type="button"
                  className="link"
                  onClick={() => start.mutate(session.id)}
                  disabled={!canStart || start.isPending}
                  title={canStart ? undefined : t('sessions.needPartners')}
                >
                  {t('sessions.start')}
                </button>
              ) : null}
              {session.status === 'in_progress' ? (
                <button
                  type="button"
                  className="link"
                  onClick={() => complete.mutate(session.id)}
                  disabled={complete.isPending}
                >
                  {t('sessions.complete')}
                </button>
              ) : null}
              <button
                type="button"
                className="link danger-link"
                onClick={() => {
                  if (window.confirm(t('sessions.deleteConfirm'))) {
                    remove.mutate(session.id);
                  }
                }}
              >
                {t('sessions.delete')}
              </button>
            </div>
          </li>
        ))}
      </ul>
      {start.isError ? <p className="error">{t('common.error')}</p> : null}

      <form className="card" onSubmit={onCreate}>
        <h3>{t('sessions.new')}</h3>
        <label>
          {t('sessions.kindLabel')}
          <select value={kind} onChange={(event) => setKind(event.target.value as SessionKind)}>
            <option value="initial">{t('sessions.kind.initial')}</option>
            <option value="review">{t('sessions.kind.review')}</option>
          </select>
        </label>
        {kind === 'review' ? (
          <label>
            {t('sessions.baselineLabel')}
            <select
              value={baselineSessionId}
              onChange={(event) => setBaselineSessionId(event.target.value)}
            >
              <option value="">{t('sessions.baselinePlaceholder')}</option>
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {sessionLabel(session)} ({t(statusLabelKey[session.status])})
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label>
          {t('sessions.titleLabel')}
          <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} />
        </label>
        <button type="submit" disabled={create.isPending || reviewWithoutBaseline}>
          {t('sessions.create')}
        </button>
        {reviewWithoutBaseline ? <p className="muted">{t('sessions.baselineHint')}</p> : null}
        {create.isError ? <p className="error">{t('common.error')}</p> : null}
      </form>
    </section>
  );
}
