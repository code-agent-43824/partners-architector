import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useLogin } from '../auth/useAuth';
import { t } from '../i18n';

export function LoginPage() {
  const navigate = useNavigate();
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    login.mutate({ email, password }, { onSuccess: () => navigate('/', { replace: true }) });
  }

  return (
    <div className="centered">
      <div className="login-box">
        <p className="login-brand">{t('appName')}</p>
        <form className="card" onSubmit={onSubmit}>
          <h1>{t('login.title')}</h1>
          <label>
            {t('login.email')}
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label>
            {t('login.password')}
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {login.isError && <p className="error">{t('login.error')}</p>}
          <button type="submit" disabled={login.isPending}>
            {t('login.submit')}
          </button>
        </form>
      </div>
    </div>
  );
}
