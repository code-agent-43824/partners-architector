import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';

import { useChangePassword, useMe } from '../auth/useAuth';
import { t } from '../i18n';

export function ProfilePage() {
  const { data: user } = useMe();
  const changePassword = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [clientError, setClientError] = useState<string | null>(null);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setClientError(t('profile.passwordMismatch'));
      return;
    }
    setClientError(null);
    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        },
      },
    );
  }

  const success = changePassword.isSuccess && !changePassword.isPending;

  return (
    <>
      <Link className="link" to="/">
        {t('profile.back')}
      </Link>
      <section className="panel">
        <h1>{t('profile.title')}</h1>
        {user ? <p className="muted">{user.email}</p> : null}
      </section>
      <form className="panel form-panel" onSubmit={onSubmit}>
        <h2>{t('profile.passwordTitle')}</h2>
        <label>
          {t('profile.currentPassword')}
          <input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <label>
          {t('profile.newPassword')}
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>
        <label>
          {t('profile.confirmPassword')}
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>
        {clientError ? <p className="error">{clientError}</p> : null}
        {changePassword.isError ? <p className="error">{t('profile.passwordError')}</p> : null}
        {success ? <p className="success">{t('profile.passwordSaved')}</p> : null}
        <button type="submit" disabled={changePassword.isPending}>
          {t('profile.passwordSubmit')}
        </button>
      </form>
    </>
  );
}
