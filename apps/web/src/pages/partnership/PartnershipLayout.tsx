import { Link, NavLink, Outlet, useNavigate, useParams } from 'react-router-dom';

import { MIN_PARTNERS } from '../../api/partners';
import { t } from '../../i18n';
import { usePartnership } from '../../partnerships/hooks';
import { PARTNERSHIP_TAG_LABELS } from '../../partnerships/labels';
import { usePartners } from '../../partnerships/partnerHooks';
import { useSessions } from '../../partnerships/sessionHooks';

/**
 * Partnership card (D8): a shared header — name, numbered stepper
 * «Партнёрство · Участники · Сессии» and a hero CTA into the running
 * session — over three step sub-routes rendered in the Outlet.
 */
export function PartnershipLayout() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const query = usePartnership(id);
  const partners = usePartners(id);
  const sessions = useSessions(id);

  if (query.isLoading) {
    return <p className="muted">{t('common.loading')}</p>;
  }
  if (query.isError || !query.data) {
    return <p className="error">{t('detail.notFound')}</p>;
  }

  const partnership = query.data;
  const tagLabels = partnership.typeTags.map((tag) => PARTNERSHIP_TAG_LABELS[tag]).join(', ');
  const partnersDone = (partners.data?.length ?? 0) >= MIN_PARTNERS;
  const sessionsStarted = (sessions.data?.length ?? 0) > 0;
  const running = sessions.data?.find((session) => session.status === 'in_progress');

  const steps = [
    { to: `/partnerships/${id}`, end: true, label: t('steps.about'), done: true },
    {
      to: `/partnerships/${id}/partners`,
      end: false,
      label: t('steps.partners'),
      done: partnersDone,
    },
    {
      to: `/partnerships/${id}/sessions`,
      end: false,
      label: t('steps.sessions'),
      done: sessionsStarted,
    },
  ];

  return (
    <>
      <button type="button" className="link" onClick={() => navigate('/')}>
        {t('partnerships.back')}
      </button>
      <div className="page-head">
        <div className="page-head-main">
          <h1>{partnership.name}</h1>
          <p className="muted">
            {partnership.status === 'archived'
              ? t('partnerships.status.archived')
              : t('partnerships.status.active')}
            {tagLabels ? ` · ${tagLabels}` : ''}
          </p>
        </div>
        {running ? (
          <Link
            className="button-primary hero-cta"
            to={`/partnerships/${id}/sessions/${running.id}`}
          >
            {t('steps.goToSession')}
          </Link>
        ) : null}
      </div>

      <nav className="stepper" aria-label={t('steps.navLabel')}>
        {steps.map((step, index) => (
          <NavLink
            key={step.to}
            to={step.to}
            end={step.end}
            className={({ isActive }) => `step${isActive ? ' active' : ''}`}
          >
            <span className={`step-num${step.done ? ' done' : ''}`} aria-hidden="true">
              {step.done && index > 0 ? '✓' : index + 1}
            </span>
            {step.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </>
  );
}
