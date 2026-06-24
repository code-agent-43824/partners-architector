import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { PartnersSection } from '../components/PartnersSection';
import { SessionsSection } from '../components/SessionsSection';
import { t } from '../i18n';
import {
  useArchivePartnership,
  useDeletePartnership,
  usePartnership,
  useRestorePartnership,
  useUpdatePartnership,
} from '../partnerships/hooks';
import { PARTNERSHIP_TAG_LABELS } from '../partnerships/labels';

export function PartnershipDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const query = usePartnership(id);
  const update = useUpdatePartnership(id);
  const archive = useArchivePartnership(id);
  const restore = useRestorePartnership(id);
  const remove = useDeletePartnership(id);

  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  useEffect(() => {
    if (query.data) {
      setName(query.data.name);
      setNotes(query.data.notes ?? '');
    }
  }, [query.data]);

  if (query.isLoading) {
    return <p className="muted">{t('common.loading')}</p>;
  }
  if (query.isError || !query.data) {
    return <p className="error">{t('detail.notFound')}</p>;
  }

  const partnership = query.data;
  const tagLabels = partnership.typeTags.map((tag) => PARTNERSHIP_TAG_LABELS[tag]).join(', ');

  function onSave(event: FormEvent) {
    event.preventDefault();
    update.mutate({ name: name.trim(), notes });
  }

  function onDelete() {
    if (window.confirm(t('partnerships.deleteConfirm'))) {
      remove.mutate(undefined, { onSuccess: () => navigate('/') });
    }
  }

  return (
    <>
      <button type="button" className="link" onClick={() => navigate('/')}>
        {t('partnerships.back')}
      </button>
      <h1>{partnership.name}</h1>
      <p className="muted">
        {partnership.status === 'archived'
          ? t('partnerships.status.archived')
          : t('partnerships.status.active')}
        {tagLabels ? ` · ${tagLabels}` : ''}
      </p>

      <form className="card" onSubmit={onSave}>
        <label>
          {t('partnerships.nameLabel')}
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={200} required />
        </label>
        <label>
          {t('partnerships.notesLabel')}
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
        </label>
        <button type="submit" disabled={update.isPending || !name.trim()}>
          {t('partnerships.save')}
        </button>
        {update.isError ? <p className="error">{t('common.error')}</p> : null}
      </form>

      <PartnersSection partnershipId={id} />

      <SessionsSection partnershipId={id} />

      <div className="toolbar">
        {partnership.status === 'active' ? (
          <button type="button" onClick={() => archive.mutate()}>
            {t('partnerships.archive')}
          </button>
        ) : (
          <button type="button" onClick={() => restore.mutate()}>
            {t('partnerships.restore')}
          </button>
        )}
        <button type="button" className="danger" onClick={onDelete}>
          {t('partnerships.delete')}
        </button>
      </div>
    </>
  );
}
