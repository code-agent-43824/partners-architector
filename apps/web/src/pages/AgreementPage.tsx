import { Link, useParams } from 'react-router-dom';

import type { AgreementMeaning, AgreementSection } from '../api/agreement';
import type { ClauseStatus } from '../api/scenario';
import { t, type TranslationKey } from '../i18n';
import { sanitizeHtml } from '../lib/sanitizeHtml';
import { useAgreement } from '../partnerships/agreementHooks';

const statusLabelKey: Record<ClauseStatus, TranslationKey> = {
  not_started: 'scenario.status.not_started',
  in_progress: 'scenario.status.in_progress',
  parked: 'scenario.status.parked',
  agreed: 'scenario.status.agreed',
  disputed: 'scenario.status.disputed',
  not_applicable: 'scenario.status.not_applicable',
};

const meaningDims: { key: keyof AgreementMeaning; label: TranslationKey }[] = [
  { key: 'voting', label: 'meaning.voting' },
  { key: 'profit', label: 'meaning.profit' },
  { key: 'ownership', label: 'meaning.ownership' },
  { key: 'losses', label: 'meaning.losses' },
];

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export function AgreementPage() {
  const { partnershipId = '', sessionId = '' } = useParams();
  const query = useAgreement(partnershipId, sessionId);

  if (query.isLoading) {
    return <p className="muted">{t('common.loading')}</p>;
  }
  if (query.isError || !query.data) {
    return <p className="error">{t('common.error')}</p>;
  }

  const doc = query.data;
  const assembledDate = new Date(doc.assembledAt).toLocaleDateString('ru-RU');

  return (
    <div className="agreement">
      <div className="agreement-toolbar no-print">
        <Link className="link" to={`/partnerships/${partnershipId}/sessions/${sessionId}`}>
          {t('agreement.back')}
        </Link>
        <span className="spacer" />
        <button type="button" onClick={() => window.print()}>
          {t('agreement.print')}
        </button>
      </div>

      <article className="agreement-doc">
        <header className="doc-title">
          <p className="doc-kicker">
            {t('agreement.title')} · {t(`sessions.kind.${doc.sessionKind}` as TranslationKey)}
          </p>
          <h1>{doc.partnershipName}</h1>
          {doc.sessionTitle ? <p className="doc-subtitle">{doc.sessionTitle}</p> : null}
          <dl className="doc-meta">
            <div>
              <dt>{t('agreement.participants')}</dt>
              <dd>
                {doc.participants.length > 0
                  ? doc.participants
                      .map((p) => (p.role ? `${p.fullName} (${p.role})` : p.fullName))
                      .join(', ')
                  : '—'}
              </dd>
            </div>
            <div>
              <dt>{t('agreement.date')}</dt>
              <dd>{assembledDate}</dd>
            </div>
            <div>
              <dt>{t('agreement.statusLabel')}</dt>
              <dd>{t(`sessions.status.${doc.sessionStatus}` as TranslationKey)}</dd>
            </div>
            <div>
              <dt>{t('agreement.summaryLabel')}</dt>
              <dd>
                {t('agreement.summaryAgreed')}: {doc.summary.agreed}/{doc.summary.applicable} ·{' '}
                {t('agreement.summaryConfirmed')}: {doc.summary.fullyConfirmed}
              </dd>
            </div>
          </dl>
          {doc.sessionStatus !== 'completed' ? (
            <p className="doc-draft-note">{t('agreement.draftNote')}</p>
          ) : null}
        </header>

        <section className="doc-principles">
          <h2>{t('agreement.principlesTitle')}</h2>
          <ol>
            {doc.principles.map((principle) => (
              <li key={principle.title}>
                <strong>{principle.title}</strong> {principle.body}
              </li>
            ))}
          </ol>
        </section>

        <section className="doc-sections">
          {doc.sections.map((section) => (
            <AgreementSectionView key={section.number} section={section} />
          ))}
        </section>
      </article>
    </div>
  );
}

function AgreementSectionView({ section }: { section: AgreementSection }) {
  const signedNames = section.signoffs.filter((s) => s.agreed).map((s) => s.partnerName);
  const allSigned = section.signoffs.length > 0 && signedNames.length === section.signoffs.length;
  const isNa = section.status === 'not_applicable';

  return (
    <article className="doc-section">
      <h3>
        {section.number}. {section.title}
      </h3>
      <p className="doc-section-meta">
        {section.category}
        {section.isSensitive ? ` · ${t('scenario.heavyBadge')}` : ''} ·{' '}
        {t(statusLabelKey[section.status])}
      </p>

      {isNa ? (
        <p className="doc-na">
          {t('agreement.naLabel')}
          {section.naReason ? `: ${section.naReason}` : ''}
        </p>
      ) : (
        <>
          {section.text && sanitizeHtml(section.text).trim() ? (
            <div
              className="doc-formulation"
              // Sanitized above with an allowlist; no scripts/attributes survive.
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(section.text) }}
            />
          ) : (
            <p className="doc-empty muted">{t('agreement.notFilled')}</p>
          )}

          {section.rationale ? (
            <p className="doc-rationale">
              <em>
                {t('agreement.rationale')}: {section.rationale}
              </em>
            </p>
          ) : null}

          {section.shares ? (
            <div className="doc-shares">
              <table>
                <tbody>
                  {section.shares.allocations.map((a) => (
                    <tr key={a.partnerName}>
                      <td>{a.partnerName}</td>
                      <td className="doc-shares-pct">{round(a.percent)}%</td>
                    </tr>
                  ))}
                  <tr className="doc-shares-total">
                    <td>{t('agreement.sharesTotal')}</td>
                    <td className="doc-shares-pct">{round(section.shares.total)}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : null}

          {section.meaning ? (
            <p className="doc-meaning">
              {t('agreement.meaningTitle')}:{' '}
              {meaningDims.filter((d) => section.meaning?.[d.key]).length > 0
                ? meaningDims
                    .filter((d) => section.meaning?.[d.key])
                    .map((d) => t(d.label))
                    .join(', ')
                : t('agreement.meaningNone')}
            </p>
          ) : null}

          {section.signoffs.length > 0 ? (
            <p className="doc-signoff muted">
              {allSigned
                ? t('agreement.confirmedAll')
                : signedNames.length > 0
                  ? `${t('agreement.confirmedBy')}: ${signedNames.join(', ')}`
                  : t('agreement.notConfirmed')}
            </p>
          ) : null}
        </>
      )}
    </article>
  );
}
