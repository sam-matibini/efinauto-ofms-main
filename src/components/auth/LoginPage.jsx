import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Self-hosted replacement for Base44's hosted /login page.
 *
 * Base44 apps redirect unauthenticated users to `/login?next=<path>` (see the shim's
 * `auth.redirectToLogin`). On base44.app that page was hosted by the platform; a migrated app has no
 * such route, so React Router falls through to "Page Not Found". This component is injected by the
 * migration and wired to `/login` (outside the app Layout, which would otherwise re-trigger the
 * redirect and loop).
 *
 * Auth path: passwordless email OTP via the shim (`auth.sendLoginOtp` / `auth.verifyLoginOtp`).
 * Imported Base44 users have no password and no OAuth identity, so email OTP is the login method that
 * works for them out of the box. The emailed message contains both a magic link (click → returns to
 * `next`, session auto-detected) and a 6-digit code (enter below — needs no redirect allowlist).
 *
 * OAUTH_PROVIDERS is empty by default: the migration does not provision Google/Microsoft OAuth client
 * credentials on the target project (Base44's are private and locked to base44.app). Once a provider
 * is configured for a project, add it here (e.g. ['google']) to render a "Continue with …" button.
 */
const OAUTH_PROVIDERS = []; // e.g. ['google', 'azure'] once client credentials are provisioned

const PROVIDER_LABEL = { google: 'Google', azure: 'Microsoft', github: 'GitHub' };

function getNext() {
  if (typeof window === 'undefined') return '/';
  const next = new URLSearchParams(window.location.search).get('next');
  // Only accept same-origin relative paths — never an absolute URL (open-redirect guard).
  if (next && next.startsWith('/') && !next.startsWith('//')) return next;
  return '/';
}

function appName() {
  if (typeof document !== 'undefined' && document.title) return document.title;
  return 'your account';
}

export default function LoginPage() {
  const [step, setStep] = useState('email'); // 'email' | 'code'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const next = getNext();
  const name = appName();

  // Already signed in (e.g. landed here after a magic-link redirect) → leave immediately.
  useEffect(() => {
    let cancelled = false;
    base44.auth.isAuthenticated().then((yes) => {
      if (yes && !cancelled) window.location.assign(next);
    });
    return () => { cancelled = true; };
  }, [next]);

  const sendCode = async (e) => {
    e?.preventDefault();
    setError(null);
    if (!email) { setError('Enter your email address.'); return; }
    setBusy(true);
    try {
      await base44.auth.sendLoginOtp(email, next);
      setStep('code');
      setNotice(`We emailed a sign-in link and a verification code to ${email}.`);
    } catch (err) {
      setError(err?.message || 'Could not send the code. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e) => {
    e?.preventDefault();
    setError(null);
    if (!code) { setError('Enter the verification code from your email.'); return; }
    setBusy(true);
    try {
      await base44.auth.verifyLoginOtp(email, code.trim());
      window.location.assign(next); // full reload so AuthContext picks up the new session
    } catch (err) {
      setError(err?.message || 'That code is invalid or expired. Request a new one.');
    } finally {
      setBusy(false);
    }
  };

  const oauth = async (provider) => {
    setError(null);
    try {
      await base44.auth.loginWithProvider(provider, next);
    } catch (err) {
      setError(err?.message || `Could not start ${PROVIDER_LABEL[provider] || provider} sign-in.`);
    }
  };

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.avatar}>{name.trim().charAt(0).toUpperCase() || '•'}</div>
        <h1 style={S.title}>Welcome to {name}</h1>
        <p style={S.subtitle}>Sign in to continue</p>

        {OAUTH_PROVIDERS.length > 0 && (
          <>
            {OAUTH_PROVIDERS.map((p) => (
              <button key={p} type="button" style={S.oauthBtn} onClick={() => oauth(p)} disabled={busy}>
                Continue with {PROVIDER_LABEL[p] || p}
              </button>
            ))}
            <div style={S.divider}><span style={S.dividerText}>OR</span></div>
          </>
        )}

        {step === 'email' ? (
          <form onSubmit={sendCode}>
            <label style={S.label} htmlFor="sb-login-email">Email</label>
            <input
              id="sb-login-email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={S.input}
            />
            <button type="submit" style={S.primaryBtn} disabled={busy}>
              {busy ? 'Sending…' : 'Email me a sign-in code'}
            </button>
          </form>
        ) : (
          <form onSubmit={verify}>
            <label style={S.label} htmlFor="sb-login-code">Verification code</label>
            <input
              id="sb-login-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              placeholder="Enter the code from your email"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={{ ...S.input, letterSpacing: '0.3em', textAlign: 'center' }}
            />
            <button type="submit" style={S.primaryBtn} disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
            <button type="button" style={S.linkBtn} onClick={() => { setStep('email'); setNotice(null); setCode(''); }}>
              Use a different email
            </button>
          </form>
        )}

        {notice && <p style={S.notice}>{notice}</p>}
        {error && <p style={S.error}>{error}</p>}
      </div>
    </div>
  );
}

const S = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '24px', background: 'var(--canvas, #f7f8fa)',
    fontFamily: 'inherit',
  },
  card: {
    width: '100%', maxWidth: '400px', background: 'var(--surface-card-solid, #ffffff)',
    border: '1px solid var(--border-thin, #e5e7eb)', borderRadius: '16px',
    padding: '40px 36px', boxShadow: '0 10px 40px rgba(0,0,0,0.06)', textAlign: 'center',
  },
  avatar: {
    width: '64px', height: '64px', borderRadius: '50%', margin: '0 auto 20px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--brand-bg, #eef2ff)', color: 'var(--brand, #1e293b)',
    fontSize: '24px', fontWeight: 700,
  },
  title: { fontSize: '24px', fontWeight: 700, margin: '0 0 4px', color: 'var(--text-primary, #0f172a)' },
  subtitle: { fontSize: '14px', margin: '0 0 24px', color: 'var(--text-secondary, #64748b)' },
  label: { display: 'block', textAlign: 'left', fontSize: '13px', fontWeight: 600, margin: '0 0 6px', color: 'var(--text-primary, #0f172a)' },
  input: {
    width: '100%', boxSizing: 'border-box', padding: '11px 12px', fontSize: '15px',
    border: '1px solid var(--border-thin, #e5e7eb)', borderRadius: '8px', marginBottom: '16px',
    background: 'var(--canvas, #fff)', color: 'var(--text-primary, #0f172a)', outline: 'none',
  },
  primaryBtn: {
    width: '100%', padding: '12px', fontSize: '15px', fontWeight: 600, cursor: 'pointer',
    border: 'none', borderRadius: '8px', background: 'var(--brand, #0f172a)',
    color: 'var(--brand-text, #ffffff)',
  },
  oauthBtn: {
    width: '100%', padding: '12px', fontSize: '15px', fontWeight: 600, cursor: 'pointer',
    border: '1px solid var(--border-thin, #e5e7eb)', borderRadius: '8px', marginBottom: '12px',
    background: 'var(--surface-card-solid, #fff)', color: 'var(--text-primary, #0f172a)',
  },
  linkBtn: {
    background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', marginTop: '14px',
    color: 'var(--text-secondary, #64748b)', textDecoration: 'underline',
  },
  divider: { position: 'relative', textAlign: 'center', margin: '20px 0' },
  dividerText: {
    position: 'relative', background: 'var(--surface-card-solid, #fff)', padding: '0 12px',
    fontSize: '12px', color: 'var(--text-tertiary, #94a3b8)',
  },
  notice: { fontSize: '13px', marginTop: '16px', color: 'var(--text-secondary, #64748b)' },
  error: { fontSize: '13px', marginTop: '16px', color: '#dc2626' },
};
