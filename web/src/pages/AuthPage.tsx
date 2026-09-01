/**
 * Sign in, create an account, or ask for a reset link.
 *
 * One card with three modes rather than three routes: the canvas draws a
 * single auth surface, and the three flows share every field but one.
 */

import {useState} from 'react';
import type {FormEvent, ReactElement} from 'react';

import {BrandMark} from '@/components/Icon';
import {Button, ErrorBanner, Field} from '@/components/primitives';
import {useAuth} from '@/contexts/AuthContext';
import {useApiErrors} from '@/hooks/useApiErrors';
import * as authService from '@/services/auth.service';
import {AUTH_MARK_SIZE} from '@/utils/constants';

type Mode = 'login' | 'register' | 'forgot';

const COPY: Record<Mode, {title: string; subtitle: string; submit: string}> = {
  login: {
    title: 'Sign in',
    subtitle: 'Manage the devices on your network.',
    submit: 'Sign in',
  },
  register: {
    title: 'Create account',
    subtitle: 'The first device you register claims the network.',
    submit: 'Create account',
  },
  forgot: {
    title: 'Reset password',
    subtitle: 'We will send a link to your email address.',
    submit: 'Send reset link',
  },
};

export function AuthPage(): ReactElement {
  const {signIn, signUp} = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [mismatch, setMismatch] = useState(false);
  const errors = useApiErrors();

  const copy = COPY[mode];

  const switchTo = (next: Mode): void => {
    setMode(next);
    setSent(false);
    setMismatch(false);
    setConfirm('');
    errors.clear();
  };

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    errors.clear();
    setMismatch(false);

    // Checked here because the server never sees the confirmation field --
    // it is a typing aid, not part of the contract.
    if (mode === 'register' && password !== confirm) {
      setMismatch(true);
      return;
    }

    setBusy(true);
    try {
      if (mode === 'login') {
        await signIn(email, password);
      } else if (mode === 'register') {
        await signUp(email, password);
      } else {
        await authService.forgotPassword(email);
        // The endpoint answers identically for an address it does not know, so
        // this message must not confirm the address exists either. Saying
        // "if that address has an account" is the whole point.
        setSent(true);
      }
    } catch (error) {
      errors.capture(error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-shell">
      <form className="auth-card" onSubmit={event => void submit(event)}>
        <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
          <span style={{color: 'var(--color-text)', display: 'flex'}}>
            <BrandMark size={AUTH_MARK_SIZE} />
          </span>
          <span className="brand-name" style={{fontSize: 18}}>
            BeepMyDevice
          </span>
        </div>

        <h1 style={{marginTop: 'var(--space-6)'}}>{copy.title}</h1>
        <p className="text-muted" style={{marginTop: 4, fontSize: 14}}>
          {copy.subtitle}
        </p>

        <ErrorBanner errors={errors.banner} onDismiss={errors.clear} />

        {sent ? (
          <p style={{margin: 'var(--space-6) 0'}}>
            If that address has an account, a reset link is on its way.
          </p>
        ) : (
          <div className="auth-fields">
            <Field label="Email" htmlFor="email" error={errors.fields.email}>
              <input
                id="email"
                className={errors.fields.email !== undefined ? 'input input-invalid' : 'input'}
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={event => setEmail(event.target.value)}
              />
            </Field>

            {mode !== 'forgot' && (
              <Field label="Password" htmlFor="password" error={errors.fields.password}>
                <input
                  id="password"
                  className={
                    errors.fields.password !== undefined ? 'input input-invalid' : 'input'
                  }
                  type="password"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                />
              </Field>
            )}

            {mode === 'register' && (
              <Field
                label="Confirm password"
                htmlFor="confirm"
                error={mismatch ? 'The two passwords do not match.' : undefined}
              >
                <input
                  id="confirm"
                  className={mismatch ? 'input input-invalid' : 'input'}
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={event => setConfirm(event.target.value)}
                />
              </Field>
            )}
          </div>
        )}

        {!sent && (
          <Button type="submit" variant="primary" className="btn-block" disabled={busy}>
            {busy ? 'Working…' : copy.submit}
          </Button>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 'var(--space-4)',
            fontSize: 13,
          }}
        >
          {mode === 'login' ? (
            <>
              <button type="button" className="btn btn-ghost" onClick={() => switchTo('register')}>
                Create account
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => switchTo('forgot')}>
                Forgot password?
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-ghost" onClick={() => switchTo('login')}>
              Back to sign in
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
