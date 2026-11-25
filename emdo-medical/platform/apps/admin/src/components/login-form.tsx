'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ErrorState } from './error-state';

export function LoginForm({ reason }: { reason?: string }) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(reason ?? null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/session/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const payload = await response.json() as { error?: { code?: unknown } };
      if (!response.ok) {
        setError(typeof payload.error?.code === 'string' ? payload.error.code : 'INTERNAL_ERROR');
        setBusy(false);
        return;
      }
      router.replace('/');
      router.refresh();
    } catch {
      setError('API_UNAVAILABLE');
      setBusy(false);
    }
  }

  return (
    <form className="login-panel panel" onSubmit={onSubmit}>
      <h1>Super Admin sign-in</h1>
      <p className="notice">Authorised administrative roles only. No patient-record access exists here.</p>
      {error && <ErrorState code={error} />}
      <label htmlFor="identifier">Email or phone</label>
      <input
        id="identifier"
        name="identifier"
        autoComplete="username"
        required
        minLength={5}
        maxLength={254}
        value={identifier}
        onChange={(event) => setIdentifier(event.target.value)}
      />
      <label htmlFor="password">Password</label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        minLength={12}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <button type="submit" disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
