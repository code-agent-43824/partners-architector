import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';

import type { PartnershipTag } from '../api/partnerships';
import { t } from '../i18n';
import { useCreatePartnership, usePartnerships } from '../partnerships/hooks';
import { PARTNERSHIP_TAG_LABELS, PARTNERSHIP_TAGS } from '../partnerships/labels';

type StatusFilter = 'active' | 'archived' | 'all';

export function PartnershipsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('active');
  const list = usePartnerships({ search: search.trim() || undefined, status });

  const create = useCreatePartnership();
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<PartnershipTag[]>([]);

  function toggleTag(tag: PartnershipTag) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((value) => value !== tag) : [...prev, tag],
    );
  }

  function onCreate(event: FormEvent) {
    event.preventDefault();
    create.mutate(
      { name: name.trim(), typeTags: tags, notes: notes.trim() || undefined },
      {
        onSuccess: () => {
          setName('');
          setNotes('');
          setTags([]);
        },
      },
    );
  }

  return (
    <>
      <h1>{t('partnerships.title')}</h1>

      <form className="card" onSubmit={onCreate}>
        <h2>{t('partnerships.new')}</h2>
        <label>
          {t('partnerships.nameLabel')}
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={200} required />
        </label>
        <fieldset className="tags">
          <legend>{t('partnerships.tagsLabel')}</legend>
          {PARTNERSHIP_TAGS.map((tag) => (
            <label key={tag} className="checkbox">
              <input type="checkbox" checked={tags.includes(tag)} onChange={() => toggleTag(tag)} />
              {PARTNERSHIP_TAG_LABELS[tag]}
            </label>
          ))}
        </fieldset>
        <label>
          {t('partnerships.notesLabel')}
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </label>
        <button type="submit" disabled={create.isPending || !name.trim()}>
          {t('partnerships.create')}
        </button>
        {create.isError ? <p className="error">{t('common.error')}</p> : null}
      </form>

      <div className="toolbar">
        <input
          placeholder={t('partnerships.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
          <option value="active">{t('partnerships.filter.active')}</option>
          <option value="archived">{t('partnerships.filter.archived')}</option>
          <option value="all">{t('partnerships.filter.all')}</option>
        </select>
      </div>

      {list.isLoading ? <p className="muted">{t('common.loading')}</p> : null}
      {list.isError ? <p className="error">{t('common.error')}</p> : null}
      {list.data && list.data.length === 0 ? (
        <p className="muted">{t('partnerships.empty')}</p>
      ) : null}

      <ul className="list">
        {list.data?.map((partnership) => (
          <li key={partnership.id} className="list-item">
            <Link to={`/partnerships/${partnership.id}`}>{partnership.name}</Link>
            <span className="muted">
              {partnership.status === 'archived'
                ? t('partnerships.status.archived')
                : t('partnerships.status.active')}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
