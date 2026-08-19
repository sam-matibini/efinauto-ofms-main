import React, { useEffect, useState } from 'react';
import { supabase } from '@/api/supabaseClient';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [validSession, setValidSession] = useState(null);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.isAuthenticated().then((yes) => {
      if (!cancelled) setValidSession(yes);
    });
    return () => { cancelled = true; };
  }, []);

  const handleReset = async (e) => {
    e?.preventDefault();
    setError(null);
    if (!password) { setError('Enter a new password.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setBusy(true);
    try {
      await supabase.auth.resetPassword({ newPassword: password });
      setDone(true);
    } catch (err) {
      setError(err?.message || 'Could not reset password. The link may have expired — request a new one.');
    } finally {
      setBusy(false);
    }
  };

  if (validSession === null) {
    return (
      <div style={S.page}>
        <div style={S.card}>
          <div style={S.spinner} />
        </div>
      </div>
    );
  }

  if (!validSession) {
    return (
      <div style={S.page}>
        <div style={S.card}>
          <a href="/login" style={S.backLink}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
              <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
            </svg>
            Back to Login
          </a>
          <div style={S.logoWrap}>
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69156af15abcfb916d821138/8e61b7743_1c.png"
              alt="eFinAuto"
              style={S.logo}
            />
          </div>
          <h1 style={S.title}>Link expired</h1>
          <p style={S.subtitle}>
            This password reset link is invalid or has expired. Please request a new one from the login page.
          </p>
          <a href="/login" style={S.primaryBtn}>
            Back to Login
          </a>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div style={S.page}>
        <div style={S.card}>
          <a href="/login" style={S.backLink}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
              <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
            </svg>
            Back to Login
          </a>
          <div style={S.logoWrap}>
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69156af15abcfb916d821138/8e61b7743_1c.png"
              alt="eFinAuto"
              style={S.logo}
            />
          </div>
          <div style={S.checkCircle}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h1 style={S.title}>Password updated</h1>
          <p style={S.subtitle}>
            Your password has been successfully changed. You can now sign in with your new password.
          </p>
          <a href="/login" style={S.primaryBtn}>
            Sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.card}>
        <a href="/login" style={S.backLink}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
            <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
          </svg>
          Back to Login
        </a>

        <div style={S.logoWrap}>
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69156af15abcfb916d821138/8e61b7743_1c.png"
            alt="eFinAuto"
            style={S.logo}
          />
        </div>

        <h1 style={S.title}>Set new password</h1>
        <p style={S.subtitle}>Choose a strong password for your account</p>

        <form onSubmit={handleReset}>
          <label style={S.label} htmlFor="reset-password">New password</label>
          <div style={S.passwordWrap}>
            <input
              id="reset-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              autoFocus
              placeholder="Enter new password"
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

          <label style={S.label} htmlFor="reset-confirm-password">Confirm new password</label>
          <input
            id="reset-confirm-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Re-enter new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={S.input}
          />

          <button type="submit" style={S.primaryBtn} disabled={busy}>
            {busy ? 'Updating…' : 'Update password'}
          </button>
        </form>

        {error && <p style={S.error}>{error}</p>}
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
    display: 'block',
    width: '100%',
    padding: '12px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    borderRadius: '8px',
    background: '#0f172a',
    color: '#ffffff',
    textDecoration: 'none',
    textAlign: 'center',
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
  checkCircle: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    margin: '0 auto 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f0fdf4',
    border: '2px solid #bbf7d0',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #e2e8f0',
    borderTopColor: '#6366f1',
    borderRadius: '50%',
    animation: 'spin 0.6s linear infinite',
    margin: '20px auto',
  },
};
