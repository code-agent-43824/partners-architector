import { type FormEvent, useState } from 'react';

import { MAX_PARTNERS, MIN_PARTNERS, type Partner } from '../api/partners';
import { t } from '../i18n';
import {
  useAddPartner,
  usePartners,
  useRemovePartner,
  useReorderPartners,
  useUpdatePartner,
} from '../partnerships/partnerHooks';

export function PartnersSection({ partnershipId }: { partnershipId: string }) {
  const list = usePartners(partnershipId);
  const add = useAddPartner(partnershipId);
  const remove = useRemovePartner(partnershipId);
  const reorder = useReorderPartners(partnershipId);

  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('');
  const [contact, setContact] = useState('');

  const partners = list.data ?? [];
  const atMax = partners.length >= MAX_PARTNERS;

  function onAdd(event: FormEvent) {
    event.preventDefault();
    add.mutate(
      { fullName: fullName.trim(), role: role.trim() || null, contact: contact.trim() || null },
      {
        onSuccess: () => {
          setFullName('');
          setRole('');
          setContact('');
        },
      },
    );
  }

  function move(index: number, direction: -1 | 1) {
    const ids = partners.map((partner) => partner.id);
    const target = index + direction;
    if (target < 0 || target >= ids.length) {
      return;
    }
    const current = ids[index];
    const swapped = ids[target];
    if (current === undefined || swapped === undefined) {
      return;
    }
    ids[index] = swapped;
    ids[target] = current;
    reorder.mutate(ids);
  }

  return (
    <section>
      <h2>{t('partners.title')}</h2>
      {partners.length < MIN_PARTNERS ? <p className="muted">{t('partners.minHint')}</p> : null}
      {list.isLoading ? <p className="muted">{t('common.loading')}</p> : null}
      {list.isError ? <p className="error">{t('common.error')}</p> : null}
      {list.data && partners.length === 0 ? <p className="muted">{t('partners.empty')}</p> : null}

      <ul className="list">
        {partners.map((partner, index) => (
          <PartnerRow
            key={partner.id}
            partnershipId={partnershipId}
            partner={partner}
            isFirst={index === 0}
            isLast={index === partners.length - 1}
            reordering={reorder.isPending}
            onMoveUp={() => move(index, -1)}
            onMoveDown={() => move(index, 1)}
            onRemove={() => {
              if (window.confirm(t('partners.removeConfirm'))) {
                remove.mutate(partner.id);
              }
            }}
          />
        ))}
      </ul>

      <form className="card" onSubmit={onAdd}>
        <h3>{t('partners.add')}</h3>
        <label>
          {t('partners.fullName')}
          <input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            maxLength={200}
            required
            disabled={atMax}
          />
        </label>
        <label>
          {t('partners.role')}
          <input
            value={role}
            onChange={(event) => setRole(event.target.value)}
            maxLength={200}
            disabled={atMax}
          />
        </label>
        <label>
          {t('partners.contact')}
          <input
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            maxLength={200}
            disabled={atMax}
          />
        </label>
        <button type="submit" disabled={atMax || add.isPending || !fullName.trim()}>
          {t('partners.add')}
        </button>
        {atMax ? <p className="muted">{t('partners.maxReached')}</p> : null}
        {add.isError ? <p className="error">{t('common.error')}</p> : null}
      </form>
    </section>
  );
}

interface PartnerRowProps {
  partnershipId: string;
  partner: Partner;
  isFirst: boolean;
  isLast: boolean;
  reordering: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}

function PartnerRow({
  partnershipId,
  partner,
  isFirst,
  isLast,
  reordering,
  onMoveUp,
  onMoveDown,
  onRemove,
}: PartnerRowProps) {
  const update = useUpdatePartner(partnershipId);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(partner.fullName);
  const [role, setRole] = useState(partner.role ?? '');
  const [contact, setContact] = useState(partner.contact ?? '');

  function startEdit() {
    setFullName(partner.fullName);
    setRole(partner.role ?? '');
    setContact(partner.contact ?? '');
    setEditing(true);
  }

  function onSave(event: FormEvent) {
    event.preventDefault();
    update.mutate(
      {
        partnerId: partner.id,
        body: {
          fullName: fullName.trim(),
          role: role.trim() || null,
          contact: contact.trim() || null,
        },
      },
      { onSuccess: () => setEditing(false) },
    );
  }

  if (editing) {
    return (
      <li className="list-item">
        <form className="partner-edit" onSubmit={onSave}>
          <input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            maxLength={200}
            required
            placeholder={t('partners.fullName')}
          />
          <input
            value={role}
            onChange={(event) => setRole(event.target.value)}
            maxLength={200}
            placeholder={t('partners.role')}
          />
          <input
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            maxLength={200}
            placeholder={t('partners.contact')}
          />
          <div className="partner-actions">
            <button type="submit" disabled={update.isPending || !fullName.trim()}>
              {t('partners.save')}
            </button>
            <button type="button" className="link" onClick={() => setEditing(false)}>
              {t('partners.cancel')}
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="list-item">
      <span className="partner-name">
        {partner.fullName}
        {partner.role ? <span className="muted"> · {partner.role}</span> : null}
        {partner.contact ? <span className="muted"> · {partner.contact}</span> : null}
      </span>
      <div className="partner-actions">
        <button
          type="button"
          className="link"
          onClick={onMoveUp}
          disabled={isFirst || reordering}
          title={t('partners.moveUp')}
        >
          ↑
        </button>
        <button
          type="button"
          className="link"
          onClick={onMoveDown}
          disabled={isLast || reordering}
          title={t('partners.moveDown')}
        >
          ↓
        </button>
        <button type="button" className="link" onClick={startEdit}>
          {t('partners.edit')}
        </button>
        <button type="button" className="link danger-link" onClick={onRemove}>
          {t('partners.remove')}
        </button>
      </div>
    </li>
  );
}
