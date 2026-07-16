import { type FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { ConfirmDialog } from '../../components/ConfirmDialog';
import { t } from '../../i18n';
import {
  useArchivePartnership,
  useDeletePartnership,
  usePartnership,
  useRestorePartnership,
  useUpdatePartnership,
} from '../../partnerships/hooks';

/** Step 1 of the partnership card: name/notes + the quiet manage row. */
export function AboutStep() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const query = usePartnership(id);
  const update = useUpdatePartnership(id);
  const archive = useArchivePartnership(id);
  const restore = useRestorePartnership(id);
  const remove = useDeletePartnership(id);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  useEffect(() => {
    if (query.data) {
      setName(query.data.name);
      setNotes(query.data.notes ?? '');
    }
  }, [query.data]);

  if (!query.data) {
    return null;
  }
  const partnership = query.data;

  function onSave(event: FormEvent) {
    event.preventDefault();
    update.mutate({ name: name.trim(), notes });
  }

  return (
    <>
      <form className="card form-panel" onSubmit={onSave}>
        <label>
          {t('partnerships.nameLabel')}
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={200} required />
        </label>
        <label>
          {t('partnerships.notesLabel')}
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
        </label>
        <div className="form-actions">
          <button type="submit" disabled={update.isPending || !name.trim()}>
            {t('partnerships.save')}
          </button>
        </div>
        {update.isError ? <p className="error">{t('common.error')}</p> : null}
      </form>

      <div className="step-cta">
        <Link className="button-primary" to={`/partnerships/${id}/partners`}>
          {t('steps.nextPartners')}
        </Link>
      </div>

      <section className="manage-row">
        <h3>{t('steps.manageTitle')}</h3>
        <div className="manage-actions">
          {partnership.status === 'active' ? (
            <button type="button" className="quiet" onClick={() => archive.mutate()}>
              {t('partnerships.archive')}
            </button>
          ) : (
            <button type="button" className="quiet" onClick={() => restore.mutate()}>
              {t('partnerships.restore')}
            </button>
          )}
          <button type="button" className="link danger-link" onClick={() => setConfirmDelete(true)}>
            {t('partnerships.delete')}
          </button>
        </div>
      </section>

      {confirmDelete ? (
        <ConfirmDialog
          title={t('partnerships.delete')}
          message={t('partnerships.deleteConfirm')}
          confirmLabel={t('partnerships.delete')}
          danger
          busy={remove.isPending}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => remove.mutate(undefined, { onSuccess: () => navigate('/') })}
        />
      ) : null}
    </>
  );
}
