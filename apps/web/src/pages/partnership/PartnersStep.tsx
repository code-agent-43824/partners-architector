import { Link, useParams } from 'react-router-dom';

import { MIN_PARTNERS } from '../../api/partners';
import { PartnersSection } from '../../components/PartnersSection';
import { t } from '../../i18n';
import { usePartners } from '../../partnerships/partnerHooks';

/** Step 2 of the partnership card: the participants editor. */
export function PartnersStep() {
  const { id = '' } = useParams();
  const partners = usePartners(id);
  const enough = (partners.data?.length ?? 0) >= MIN_PARTNERS;

  return (
    <>
      <PartnersSection partnershipId={id} />
      <div className="step-cta">
        {enough ? (
          <Link className="button-primary" to={`/partnerships/${id}/sessions`}>
            {t('steps.nextSessions')}
          </Link>
        ) : (
          <>
            <span className="muted">{t('sessions.needPartners')}</span>
            <span className="button-primary is-disabled" aria-disabled="true">
              {t('steps.nextSessions')}
            </span>
          </>
        )}
      </div>
    </>
  );
}
