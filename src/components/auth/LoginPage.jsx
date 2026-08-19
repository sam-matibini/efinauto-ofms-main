import React, { useEffect, useState } from 'react';
import { supabase } from '@/api/supabaseClient';

export default function LoginPage() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const next = (() => {
    if (typeof window === 'undefined') return '/';
    const n = new URLSearchParams(window.location.search).get('next');
    if (n && n.startsWith('/') && !n.startsWith('//')) return n;
    return '/';
  })();

  useEffect(() => {
    let cancelled = false;
    supabase.auth.isAuthenticated().then((yes) => {
      if (yes && !cancelled) window.location.assign(next);
    });
    return () => { cancelled = true; };
  }, [next]);

  const handleLogin = async (e) => {
    e?.preventDefault();
    setError(null);
    setNotice(null);
    if (!email) { setError('Enter your email address.'); return; }
    if (!password) { setError('Enter your password.'); return; }
    setBusy(true);
    try {
      await supabase.auth.signIn({ email, password });
      window.location.assign(next);
    } catch (err) {
      setError(err?.message || 'Invalid email or password. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleSignup = async (e) => {
    e?.preventDefault();
    setError(null);
    setNotice(null);
    if (!email) { setError('Enter your email address.'); return; }
    if (!password) { setError('Enter a password.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setBusy(true);
    try {
      const result = await supabase.auth.signUp({ email, password });
      if (result.session) {
        window.location.assign(next);
      } else {
        setNotice('Account created! Check your email to verify your account, then sign in.');
        setMode('login');
        setPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setError(err?.message || 'Could not create account. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const isLogin = mode === 'login';

  return (
    <div style={S.page}>
      <div style={S.card}>
        {/* Back to Home */}
        <a href="/" style={S.backLink}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
            <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
          </svg>
          Back to Home
        </a>

        {/* Logo */}
        <div style={S.logoWrap}>
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69156af15abcfb916d821138/8e61b7743_1c.png"
            alt="eFinAuto"
            style={S.logo}
          />
        </div>

        <h1 style={S.title}>{isLogin ? 'Welcome back' : 'Create your account'}</h1>
        <p style={S.subtitle}>
          {isLogin
            ? 'Sign in to access your dashboard'
            : 'Get started with eFinAuto OFMS'}
        </p>

        <form onSubmit={isLogin ? handleLogin : handleSignup}>
          {/* Email */}
          <label style={S.label} htmlFor="auth-email">Email</label>
          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            autoFocus
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={S.input}
          />

          {/* Password */}
          <label style={S.label} htmlFor="auth-password">Password</label>
          <div style={S.passwordWrap}>
            <input
              id="auth-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ ...S.input, marginBottom: 0, flex: 1 }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={S.eyeBtn}
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>

          {/* Confirm Password (signup only) */}
          {!isLogin && (
            <>
              <label style={S.label} htmlFor="auth-confirm-password">Confirm Password</label>
              <input
                id="auth-confirm-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={S.input}
              />
            </>
          )}

          {/* Forgot password (login only) */}
          {isLogin && (
            <div style={{ textAlign: 'right', marginTop: -8, marginBottom: 16 }}>
              <a href="/forgot-password" style={S.forgotBtn}>
                Forgot password?
              </a>
            </div>
          )}

          {/* Submit */}
          <button type="submit" style={S.primaryBtn} disabled={busy}>
            {busy
              ? (isLogin ? 'Signing in…' : 'Creating account…')
              : (isLogin ? 'Sign in' : 'Create account')}
          </button>
        </form>

        {/* Notices & Errors */}
        {notice && <p style={S.notice}>{notice}</p>}
        {error && <p style={S.error}>{error}</p>}

        {/* Toggle login/signup */}
        <p style={S.footer}>
          {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            type="button"
            onClick={() => {
              setMode(isLogin ? 'signup' : 'login');
              setError(null);
              setNotice(null);
              setConfirmPassword('');
            }}
            style={S.toggleBtn}
          >
            {isLogin ? 'Create one' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}

const S = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
    fontFamily: 'inherit',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '16px',
    padding: '36px 32px 32px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
    textAlign: 'center',
    position: 'relative',
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    position: 'absolute',
    top: 16,
    left: 20,
    fontSize: '13px',
    color: '#64748b',
    textDecoration: 'none',
    fontWeight: 500,
    transition: 'color 0.15s',
  },
  logoWrap: {
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    margin: '0 auto 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#eef2ff',
    overflow: 'hidden',
  },
  logo: {
    width: '36px',
    height: '36px',
    objectFit: 'contain',
  },
  title: {
    fontSize: '22px',
    fontWeight: 700,
    margin: '0 0 4px',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: '14px',
    margin: '0 0 28px',
    color: '#64748b',
  },
  label: {
    display: 'block',
    textAlign: 'left',
    fontSize: '13px',
    fontWeight: 600,
    margin: '0 0 6px',
    color: '#0f172a',
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '11px 12px',
    fontSize: '15px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    marginBottom: '16px',
    background: '#fff',
    color: '#0f172a',
    outline: 'none',
    transition: 'border-color 0.15s',
  },
  passwordWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 0,
    marginBottom: '16px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    overflow: 'hidden',
    background: '#fff',
  },
  eyeBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '42px',
    height: '42px',
    flexShrink: 0,
    background: 'none',
    border: 'none',
    borderLeft: '1px solid #e5e7eb',
    cursor: 'pointer',
    color: '#64748b',
  },
  primaryBtn: {
    width: '100%',
    padding: '12px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    borderRadius: '8px',
    background: '#0f172a',
    color: '#ffffff',
    transition: 'background 0.15s',
  },
  forgotBtn: {
    textDecoration: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    color: '#6366f1',
    fontWeight: 500,
  },
  footer: {
    fontSize: '14px',
    marginTop: '20px',
    color: '#64748b',
  },
  toggleBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    color: '#6366f1',
    padding: 0,
  },
  notice: {
    fontSize: '13px',
    marginTop: '16px',
    padding: '10px 12px',
    borderRadius: '8px',
    background: '#f0fdf4',
    color: '#16a34a',
    border: '1px solid #bbf7d0',
  },
  error: {
    fontSize: '13px',
    marginTop: '16px',
    padding: '10px 12px',
    borderRadius: '8px',
    background: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fecaca',
  },
};
